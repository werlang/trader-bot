const db = require('../helper/database')();

const trader = {
    trade: async function() {
        this.currentCandle = new Date(this.config.fromTime);
        
        this.wallet = await require('../helper/wallet')(this.mode, this.config);
        const strategy = require(`../strategies/${ this.config.strategy }`);
        this.strategy = strategy;
        this.report = require('../helper/report')(this.config, this.wallet);
        this.api = require('../helper/api')(this, strategy);
        
        await strategy.init();
        strategy.started = true;

        if (this.mode == 'backtest') {
            this.data = await this.queryData(this.config.fromTime, this.config.toTime);
            if (!this.data) {
                this.running = false;
                return false;
            }
        }
        else if (this.mode == 'live') {
            console.log('Live trading not implemented yet');
            return false;
        }
        else if (this.mode == 'paper') {
            // fetch data for building history window
            const fromTime = new Date().getTime() - this.config.historySize * 1000 * 60 * this.config.timeframe;
            this.data = await this.queryData(fromTime, new Date());
            if (!this.data) {
                this.running = false;
                return false;
            }
            this.currentCandle = new Date(this.data[ this.data.length-1 ].tsclose);
        }
        else {
            console.log('This mode is not recognized');
            return false;
        }

        this.report.set('startingPrice', parseFloat(this.data[0].open));

        this.running = true;
        while(this.running) {
            await this.step();
        }

        this.report.show();
        this.report.serveWeb(this.wsData);

        return true;
    },

    step: async function() {
        // const perc = (this.currentCandle.getTime() - new Date(this.config.fromTime).getTime()) / (new Date(this.config.toTime).getTime() - new Date(this.config.fromTime).getTime()) * 100;
        // if (parseInt(perc) % 10 == 0)
        //     console.log(`Running strategy... ${perc.toFixed(1)}%`);

        const candle = await this.buildCandle();
        if (!candle) {
            this.running = false;
            return false;
        };

        this.api.candle = candle;
        await this.strategy.update(candle);
        this.report.append('market', candle.close );
        this.report.append('wallet', { ...(await this.api.getWallet()) } );
    },

    queryData: async function(fromTime, toTime) {
        const fromId = this.getCandleId(fromTime);
        const toId = this.getCandleId(toTime);
        
        if (this.config.verbose >= 2) {
            console.log('Querying database.');
        }
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        if (!rows.length) {
            if (this.config.verbose >= 1) {
                console.log(`No candles returned from database`);
            }
            return false;
        }
        if (fromId != rows[0].id) {
            console.log(fromId , rows[0].id)
            if (this.config.verbose >= 1) {
                console.log(`Candle not available in database: ${ this.getDateFromCandleId(fromId).toISOString() }`)
            }
            return false;
        }
        if (toId != rows[rows.length-1].id + 1) {
            console.log(toId , rows[rows.length-1].id)
            if (this.config.verbose >= 1) {
                console.log(`Candle not available in database: ${ this.getDateFromCandleId(toId).toISOString() }`)
            }
            return false;
        }

        return rows;
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    buildCandle: async function() {
        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (this.config.timeframe * 1000 * 60));
        const fromId = this.getCandleId(this.currentCandle);
        const toId = this.getCandleId(nextCandle);

        const rows = this.data.filter(e => e.id >= fromId && e.id < toId);
        if (rows.length < this.config.timeframe) {
            if (this.config.verbose >= 1) {
                console.log(`Candle not available in memory: ${ this.currentCandle.toISOString() }`);
            }

            // try to find missing candles on database
            const dbCandle = await this.queryData(this.currentCandle, nextCandle);
            if (dbCandle.length) {
                this.data.push(...dbCandle);
                return await this.buildCandle();
            }

            // fetch new candles if there is some missing
            if (!this.scanner) {
                this.scanner = require('./scanner')(this.config);                
            }
            const newCandles = await this.scanner.scan(                {
                fromTime: this.currentCandle,
                toTime: nextCandle,
            });

            if (newCandles.length <= 1) {
                if (this.config.verbose >= 1)
                console.log('No new data found, waiting a minute...');
                await new Promise(resolve => setTimeout(() => resolve(true), 1000 * 60));
                return await this.buildCandle();
            }

            this.data.push(...newCandles.map(candle => ({
                id: this.getCandleId(candle.tsOpen),
                missing: 0,
                ...candle,
            })));

            return await this.buildCandle();
        }

        const candle = {};
        rows.forEach(row => {
            candle.tsopen = candle.tsopen || row.tsopen;
            candle.tsclose = row.tsclose;
            candle.open = candle.open || parseFloat(row.open);
            candle.close = parseFloat(row.close);
            candle.low = candle.low ? Math.min(candle.low, row.low) : parseFloat(row.low);
            candle.high = candle.high ? Math.max(candle.high, row.high) : parseFloat(row.low);
            candle.volume = parseFloat(row.volume) + (candle.volume || 0);
            candle.samples = parseInt(row.samples) + (candle.samples || 0);
        });

        this.currentCandle = nextCandle;

        return candle;
    },

    getCandleId: function(time) {
        return parseInt(new Date(time).getTime() / 1000 / 60);
    },

    getDateFromCandleId(id) {
        return new Date(id * 60 * 1000);
    },
};

module.exports = async ({ config, webServerData, mode }) => {
    trader.config = config;
    trader.wsData = webServerData;
    trader.mode = mode;
    
    console.log('Trader module loaded');
    return await trader.trade();
}
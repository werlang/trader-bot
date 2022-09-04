const db = require('../helper/database')();

const trader = {
    wallet: {
        asset: 0,
        currency: 0,
    },

    trade: async function() {
        this.currentCandle = new Date(this.config.fromTime);
        this.wallet.currency = this.config.startingBalance || 100;

        const strategy = require(`../strategies/${ this.config.strategy }`);
        this.strategy = strategy;
        this.report = require('./report')(this.config, this.wallet);
        this.api = require('../helper/api')(this, strategy);
        
        strategy.init();
        strategy.started = true;

        if (this.mode == 'backtest') {
            this.data = await this.queryData();
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
            console.log('Paper trading not implemented yet');
            return false;
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
        if (this.currentCandle.getTime() > new Date(this.config.toTime).getTime()) {
            return;
        }

        // const perc = (this.currentCandle.getTime() - new Date(this.config.fromTime).getTime()) / (new Date(this.config.toTime).getTime() - new Date(this.config.fromTime).getTime()) * 100;
        // if (parseInt(perc) % 10 == 0)
        //     console.log(`Running strategy... ${perc.toFixed(1)}%`);

        const candle = this.buildCandle();
        if (!candle) {
            this.running = false;
            return false;
        };

        this.api.candle = candle;
        this.strategy.update(candle);
        this.report.append('market', candle.close );
        this.report.append('wallet', {...this.api.getWallet()} );
    },

    queryData: async function() {
        const fromId = this.getCandleId(this.config.fromTime);
        const toId = this.getCandleId(this.config.toTime);
        
        console.log('Querying database and running backtest');
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        if (fromId != rows[0].id) {
            console.log(fromId , rows[0].id)
            if (this.config.verbose > 0) {
                console.log(`Candle not available: ${ this.getDateFromCandleId(fromId).toISOString() }`)
            }
            return false;
        }
        if (toId != rows[rows.length-1].id + 1) {
            console.log(toId , rows[rows.length-1].id)
            if (this.config.verbose > 0) {
                console.log(`Candle not available: ${ this.getDateFromCandleId(toId).toISOString() }`)
            }
            return false;
        }

        return rows;
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    buildCandle: function() {
        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (this.config.timeframe * 1000 * 60));
        const fromId = this.getCandleId(this.currentCandle);
        const toId = this.getCandleId(nextCandle);

        const rows = this.data.filter(e => e.id >= fromId && e.id <= toId);
        if (!rows.length) {
            if (this.config.verbose > 0) {
                console.log(`Candle not available: ${ this.currentCandle.toISOString() }`)
            }
            return false;
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
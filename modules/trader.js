const db = require('../helper/database')();
const config = require('../helper/config');
const wallet = require('../helper/wallet');
const report = require('../helper/report');
const api = require('../helper/api');

const trader = {
    trade: async function() {
        this.currentCandle = new Date(config().fromTime);
        
        this.wallet = await wallet(this.mode);
        this.strategy = require(`../strategies/${ config().strategy }`);
        this.report = report();
        this.api = api(this, this.strategy);

        this.report.serveWeb(this.wsData);
        this.report.set('timeframe', config().timeframe);

        await this.strategy.init();
        this.strategy.started = true;

        this.data = [];

        if (this.mode == 'backtest') {
            await this.queryData(config().fromTime, config().toTime);
            if (!this.data.length) {
                this.running = false;
                return false;
            }
            this.report.set('startingTime', this.data[0].tsopen);
        }
        else if (this.mode == 'live') {
            console.log('Live trading not implemented yet');
            return false;
        }
        else if (this.mode == 'paper') {
            // fetch data for building history window
            const fromTime = new Date().getTime() - config().historySize * 1000 * 60 * config().timeframe;
            await this.queryData(fromTime, new Date());
            if (!this.data.length) {
                this.running = false;
                return false;
            }
            this.currentCandle = new Date(this.data[ this.data.length-1 ].tsclose);
            this.report.set('startingTime', this.data[ this.data.length-1 ].tsclose);
        }
        else {
            console.log('This mode is not recognized');
            return false;
        }

        this.running = true;
        while(this.running) {
            await this.step();
        }

        this.report.set('endingTime', this.data[ this.data.length-1 ].tsclose);
        this.report.show();

        return true;
    },

    step: async function() {
        const candle = await this.buildCandle();
        if (!candle) {
            this.running = false;
            return false;
        };

        this.api.candle = candle;
        await this.strategy.update(candle);
        this.report.append('market', candle.close );
        this.report.append('wallet', { ...(await this.api.getWallet()) } );
        this.report.set('endingTime', this.data[ this.data.length-1 ].tsclose);
    },

    queryData: async function(fromTime, toTime) {
        const fromId = this.getCandleId(fromTime);
        const toId = this.getCandleId(toTime);
        
        if (config().verbose >= 2) {
            console.log('Querying database.');
        }
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        if (!rows.length || fromId != rows[0].id || toId != rows[rows.length-1].id + 1) {
            if (config().verbose >= 1) {
                console.log(`Some candles were not found on database`);
            }
            
            // fetch new candles if there is some missing
            if (!this.scanner) {
                this.scanner = require('./scanner')();                
            }
            const newCandles = await this.scanner.scan(                {
                fromTime: fromTime,
                toTime: toTime,
            });

            if (newCandles.length <= 1) {
                if (config().verbose >= 1) {
                    console.log('No new data found, waiting a minute...');
                }
                await new Promise(resolve => setTimeout(() => resolve(true), 1000 * 60));
                return await this.queryData(fromTime, toTime);
            }

            return await this.queryData(fromTime, toTime);
        }

        rows.forEach(row => this.data.push(row));
        return rows;
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    buildCandle: async function() {
        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (config().timeframe * 1000 * 60));
        const fromId = this.getCandleId(this.currentCandle);
        const toId = this.getCandleId(nextCandle);

        const rows = this.data.filter(e => e.id >= fromId && e.id < toId);
        if (this.mode == 'backtest' && !rows.length && toId >= this.getCandleId(config().toTime)) {
            if (config().verbose > 0) {
                console.log(`Finish backtest!`);
            }
            return false;
        }
        if (rows.length < config().timeframe) {
            if (config().verbose >= 1) {
                console.log(`Candle not available in memory: ${ this.currentCandle.toISOString() }`);
            }

            // try to find missing candles on database
            await this.queryData(this.currentCandle, nextCandle);
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

module.exports = async ({ webServerData, mode }) => {
    trader.wsData = webServerData;
    trader.mode = mode;
    
    console.log('Trader module loaded');
    return await trader.trade();
}
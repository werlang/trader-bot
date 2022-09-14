const db = require('../helper/database')();
const config = require('../config.json');
const scanner = require('./scanner');

const candleBuilder = {
    init: function(trader) {
        this.trader = trader;
    },

    queryData: async function(fromTime, toTime) {
        const fromId = this.getCandleId(fromTime);
        const toId = this.getCandleId(toTime);
        
        if (config.verbose >= 2) {
            console.log('Querying database.');
        }
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        if (!rows.length || fromId != rows[0].id || toId != rows[rows.length-1].id + 1) {
            if (config.verbose >= 1) {
                console.log(`Some candles were not found on database`);
            }
            
            // fetch new candles if there is some missing
            if (!this.scanner) {
                this.scanner = scanner();
            }
            const newCandles = await this.scanner.scan(                {
                fromTime: fromTime,
                toTime: toTime,
            });

            if (newCandles.length <= 1) {
                if (config.verbose >= 1) {
                    console.log('No new data found, waiting a minute...');
                }
                await new Promise(resolve => setTimeout(() => resolve(true), 1000 * 60));
                return await this.queryData(fromTime, toTime);
            }

            return await this.queryData(fromTime, toTime);
        }

        rows.forEach(row => this.trader.data.push(row));
        return rows;
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    buildCandle: async function() {
        const nextCandle = new Date(new Date(this.trader.currentCandle).getTime() + (config.timeframe * 1000 * 60));
        const fromId = this.getCandleId(this.trader.currentCandle);
        const toId = this.getCandleId(nextCandle);

        const rows = this.trader.data.filter(e => e.id >= fromId && e.id < toId);
        if (this.trader.mode == 'backtest' && !rows.length && toId >= this.getCandleId(config.toTime)) {
            if (config.verbose > 0) {
                console.log(`Finish backtest!`);
            }
            return false;
        }
        if (rows.length < config.timeframe) {
            if (config.verbose >= 1) {
                console.log(`Candle not available in memory: ${ this.trader.currentCandle.toISOString() }`);
            }

            // try to find missing candles on database
            await this.queryData(this.trader.currentCandle, nextCandle);
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

        this.trader.currentCandle = nextCandle;
        return candle;
    },

    getCandleId: function(time) {
        return parseInt(new Date(time).getTime() / 1000 / 60);
    },

    // getDateFromCandleId(id) {
    //     return new Date(id * 60 * 1000);
    // },

}

module.exports = candleBuilder;
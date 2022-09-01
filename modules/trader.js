const db = require('../helper/database')();

const trader = {
    wallet: {
        asset: 0,
        currency: 0,
    },

    trade: async function() {
        this.currentCandle = new Date(this.config.fromTime);
        const strategy = require(`../strategies/${ this.config.strategy }`);
        this.api = require('../helper/api')(this, strategy);

        this.strategy = strategy;
        strategy.init();
        strategy.started = true;

        this.data = await this.fetchData();

        this.running = true;
        while(this.running) {
            await this.step();
        }
        return;
    },

    step: async function() {
        if (this.currentCandle.getTime() > new Date(this.config.toTime).getTime()) {
            return;
        }

        const candle = this.buildCandle();
        if (!candle) {
            this.running = false;
            return false;
        };

        this.api.candle = candle;
        this.strategy.update(candle);
    },

    fetchData: async function() {
        const fromId = this.getCandleId(this.config.fromTime);
        const toId = this.getCandleId(this.config.toTime);
        
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        return rows;
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    buildCandle: function() {
        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (this.config.timeframe * 1000 * 60));
        const fromId = this.getCandleId(this.currentCandle);
        const toId = this.getCandleId(nextCandle);

        if (!fromId || !toId) {
            if (this.config.verbose > 0) {
                console.log(`Candle not available: ${ this.currentCandle.toISOString() }`)
            }
            return false;
        }
        
        const rows = this.data.filter(e => e.id >= fromId && e.id <= toId);
        if (!rows.length) return false;

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
};

module.exports = config => {
    trader.config = config;
    return trader;
}
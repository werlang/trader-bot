const db = require('../helper/database')();

const trader = {
    wallet: {
        asset: 0,
        currency: 0,
    },

    trade: async function() {
        this.currentCandle = new Date(this.config.fromTime);
        const strategy = require(`../strats/${ this.config.strategy }`);
        this.api = require('../helper/api')(this, strategy);

        this.strategy = strategy;
        strategy.init();
        strategy.started = true;

        await this.step();
        return;
    },

    step: async function() {
        if (this.currentCandle.getTime() > new Date(this.config.toTime).getTime()) {
            return;
        }

        const candle = await this.fetchCandle();
        if (!candle) return false;

        this.api.candle = candle;
        this.strategy.update(candle);

        await this.step();
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    fetchCandle: async function() {
        const fromId = await (async ts => {
            const sql = `SELECT id FROM candles WHERE ? BETWEEN tsopen AND tsclose`;
            const [ rows, error ] = await db.query(sql, [ ts ]);
            return rows.length ? rows[0].id : false;
        })( this.currentCandle );

        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (this.config.timeframe * 1000 * 60));
        const toId = await (async ts => {
            const sql = `SELECT id FROM candles WHERE ? BETWEEN tsopen AND tsclose`;
            const [ rows, error ] = await db.query(sql, [ ts ]);
            return rows.length ? rows[0].id : false;
        })( nextCandle );

        if (!fromId || !toId) {
            console.log(`Candle not available: ${ this.currentCandle.toISOString() }`)
            return false;
        }

        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ? - 1`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

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
};

module.exports = config => {
    trader.config = config;
    return trader;
}
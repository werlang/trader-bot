// TODO
// NEED TO ADD A METHOD TO VERIFY IF THE TRADE IS MISSING CANDLES OR NOT.
// INTERRUPT TRADE IF MISSING CANDLES.
// MAYBE ADD OPTION TO FETCH WHEN NEEDED.

const db = require('../helper/database')();

const trader = {

    trade: async function() {
        this.currentCandle = new Date(this.config.fromTime);

        for (let i=0 ; i<50 ; i++) {
            const c = await this.fetchCandle();
            console.log(c)
        }
    },

    // get all 1m candle between currentCandle and currentCandle + timeframe. Aggregate into 1 candle and returns it. 
    fetchCandle: async function() {
        const fromId = await (async ts => {
            const sql = `SELECT id FROM candles WHERE ? BETWEEN tsopen AND tsclose`;
            const [ rows, error ] = await db.query(sql, [ ts ]);
            return rows[0].id;
        })( new Date(this.currentCandle) );

        const nextCandle = new Date(new Date(this.currentCandle).getTime() + (this.config.timeframe * 1000 * 60));
        const toId = await (async ts => {
            const sql = `SELECT id FROM candles WHERE ? BETWEEN tsopen AND tsclose`;
            const [ rows, error ] = await db.query(sql, [ ts ]);
            return rows[0].id;
        })( nextCandle );

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
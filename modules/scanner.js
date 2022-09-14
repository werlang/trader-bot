const db = require('../helper/database')();
const config = require('../config.json');

const scanner = {
    candles: {},
    resolution: 60, // 1 minute resolution

    scan: async function({ fromTime, toTime }={}) {
        if (fromTime) {
            this.fromTime = fromTime;
        }
        if (toTime) {
            this.toTime = toTime;
        }

        const missing = await this.getMissingCandles();
        fromTime = this.getTimestampFromCandleId(missing);
        toTime = this.toTime ? new Date(this.toTime).getTime() : new Date().getTime();
        
        if (config.verbose >= 2) {
            console.log(`Querying exchange...`);
        }
        const data = await this.exchange.fetch(fromTime, toTime);

        if (!data.length) return [];

        await this.save(data);

        const toSave = new Date(data[ data.length-1 ].tsClose).getTime();

        if (data.length && data.length > 1 && toSave < toTime) {
            return await this.scan();
        }
        return data;
    },

    getMissingCandles: async function() {
        const fromTime = this.getCandleId(this.fromTime);
        const toTime = this.getCandleId(this.toTime);

        const sql = `SELECT id, tsopen FROM candles WHERE id BETWEEN ? AND ?`;// AND id NOT BETWEEN 27349956 AND 27349965 AND id NOT BETWEEN 27570000 AND 27570150`;
        const [ rows, error ] = await db.query(sql, [ fromTime, toTime ]);

        // here we pick ranges present in database. ex: [1,10,12,23,56,99]
        const ranges = rows.map(e => e.id).filter((e,i,a) => e+1 != a[i+1] || e-1 != a[i-1]);

        // if the start of the range is not fetched
        if (ranges[0] > fromTime) {
            return fromTime;
        }

        // i=1 is the end of the first range. this should be the fromTime of the request
        return ranges.length > 1 ? ranges[1] : fromTime;
    },

    save: async function(data) {
        const fromStr = data[0].tsOpen.toISOString();
        const toStr = data[ data.length-1 ].tsClose.toISOString();

        if (config.verbose >= 2) {
            console.log(`Saving into database. FROM: ${ fromStr }, TO: ${ toStr }`);
        }

        const sql = `INSERT INTO candles (id, open, close, low, high, volume, tsopen, tsclose, samples, missing) VALUES (:id,:open,:close,:low,:high,:volume,:tsOpen,:tsClose,:samples,:missing) ON DUPLICATE KEY UPDATE open = :open, close = :close, low = :low, high = :high, volume = :volume, tsopen = :tsOpen, tsclose = :tsClose, samples = :samples, missing = :missing;`;
        
        const inserts = await Promise.all( data.map(async (candle, i) => {
            const newCandle = {
                id: this.getCandleId(candle.tsOpen),
                missing: 0,
                ...candle,
            };

            // this is a check to see if the data source is missing candles
            if (i > 0) {
                const diffId = newCandle.id - this.getCandleId(data[i-1].tsOpen);
                // if yes, then we create the missing candles from the previous one
                if (diffId > 1) {
                    const candlePrev = data[i-1];
                    for (let j = 1 ; j < diffId ; j++) {
                        const newCandle = {
                            id: this.getCandleId(candlePrev.tsOpen) + j,
                            tsOpen: new Date( parseFloat(candlePrev.tsOpen) + (j * this.resolution * 1000) ),
                            tsClose: new Date( parseFloat(candlePrev.tsClose) + (j * this.resolution * 1000) ),
                            open: candlePrev.open,
                            high: candlePrev.high,
                            low: candlePrev.low,
                            close: candlePrev.close,
                            volume: 0,
                            samples: 0,
                            missing: 1,
                        };
                        // console.log(newCandle)
                        db.query(sql, newCandle);
                    }
                }
            }

            return db.query(sql, newCandle);
        }));

        inserts.forEach(([_,error]) => {
            if (error) {
                console.log(error);
                return;
            }
        });
    },

    getCandleId: function(time) {
        try {
            return parseInt(new Date(time).getTime() / 1000 / this.resolution);
        }
        catch(err) {
            return parseInt(new Date().getTime() / 1000 / this.resolution);
        }
    },

    getTimestampFromCandleId(id) {
        return new Date(id * this.resolution * 1000).getTime();
    }
};

module.exports = () => {
    scanner.fromTime = config.fromTime;
    scanner.toTime = config.toTime;
    scanner.exchange = require('../exchanges/'+ config.exchange.name)();
    console.log('Scanner module loaded');
    return scanner;
};
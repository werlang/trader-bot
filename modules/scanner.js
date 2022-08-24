const fetch = require('node-fetch');

const db = require('../helper/database')();

const scanner = {
    url: 'https://api.binance.com/api/v3',
    candles: {},
    resolution: 60, // 1 minute resolution

    scan: async function() {
        const endpoint = 'klines';

        const missing = await this.getMissingCandles();
        const query = {
            symbol: this.config.symbol,
            interval: '1m',
            startTime: this.getTimestampFromCandleId(missing),
            endTime: this.config.toTime ? new Date(this.config.toTime).getTime() : new Date().getTime(),
            limit: 1000,
        }

        console.log(`Querying exchange...`);

        const url = `${ this.url }/${ endpoint }?${ new URLSearchParams(query).toString() }`;
        const req = await fetch(url, {
            headers: { "X-MBX-APIKEY": this.config.apiKey }
        });
        const data = await req.json();
        // console.log(data)

        await this.save(data);

        const toSave = new Date(data.slice(-1)[0][0]).getTime();

        if (data.length && toSave < query.endTime) {
            await this.scan();
        }
        return true;
    },

    getMissingCandles: async function() {
        const fromTime = this.getCandleId(this.config.fromTime);
        const toTime = this.getCandleId(this.config.toTime);

        const sql = `SELECT id, tsopen FROM candles WHERE id BETWEEN ? AND ?`;// AND id NOT BETWEEN 27349956 AND 27349965 AND id NOT BETWEEN 27570000 AND 27570150`;
        const [ rows, error ] = await db.query(sql, [ fromTime, toTime ]);

        // here we pick ranges present in database. ex: [1,10,12,23,56,99]
        const ranges = rows.map(e => e.id).filter((e,i,a) => e+1 != a[i+1] || e-1 != a[i-1]);

        // if the start of the range is not fetched
        if (ranges[0] > fromTime) {
            return fromTime;
        }

        // if the end of the range is not fetched
        if (ranges[ ranges.length - 1 ] < toTime) {
            return ranges[ ranges.length - 1 ];
        }

        // i=1 is the end of the first range. this should be the fromTime of the request
        return ranges.length ? ranges[1] : fromTime;
    },

    save: async function(data) {
        const fromStr = new Date(data[0][0]).toISOString();
        const toStr = new Date(data.slice(-1)[0][0]).toISOString();
        console.log(`Saving into database. FROM: ${ fromStr }, TO: ${ toStr }`);

        const sql = `INSERT INTO candles (id, open, close, low, high, volume, tsopen, tsclose, samples, missing) VALUES (:id,:open,:close,:low,:high,:volume,:tsOpen,:tsClose,:samples,:missing) ON DUPLICATE KEY UPDATE open = :open, close = :close, low = :low, high = :high, volume = :volume, tsopen = :tsOpen, tsclose = :tsClose, samples = :samples, missing = :missing;`;
        
        const inserts = await Promise.all( data.map(async (candle, i) => {
            const newCandle = {
                id: this.getCandleId(candle[0]),
                tsOpen: new Date(candle[0]),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5],
                tsClose: new Date(candle[6]),
                samples: candle[8],
                missing: 0,
            };

            // this is a check to see if the data source is missing candles
            if (i > 0) {
                const diffId = this.getCandleId(candle[0]) - this.getCandleId(data[i-1][0]);
                // if yes, then we create the missing candles from the previous one
                if (diffId > 1) {
                    const candlePrev = data[i-1];
                    for (let j = 1 ; j < diffId ; j++) {
                        const newCandle = {
                            id: this.getCandleId(candlePrev[0]) + j,
                            tsOpen: new Date( parseFloat(candlePrev[0]) + (j * this.resolution * 1000) ),
                            tsClose: new Date( parseFloat(candlePrev[6]) + (j * this.resolution * 1000) ),
                            open: candlePrev[1],
                            high: candlePrev[2],
                            low: candlePrev[3],
                            close: candlePrev[4],
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

module.exports = config => {
    scanner.config = config;
    return scanner;
};
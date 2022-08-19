const fetch = require('node-fetch');

const db = require('./database')();

const scanner = {
    url: 'https://api.binance.com/api/v3',
    candles: {},
    resolution: 60, // 1 minute resolution

    scan: async function() {
        const endpoint = 'klines';
        
        const query = {
            symbol: this.config.symbol,
            interval: '1m',
            startTime: new Date(this.config.fromTime).getTime(),
            endTime: this.config.toTime ? new Date(this.config.toTime).getTime() : new Date().getTime(),
            limit: 1000,
        }

        console.log(`Querying exchange...`);

        const req = await fetch(`${ this.url }/${ endpoint }?${ new URLSearchParams(query).toString() }`, {
            headers: { "X-MBX-APIKEY": this.config.apiKey }
        });
        const data = await req.json();

        await this.save(data);

        const toSave = new Date(data.slice(-1)[0][0]).getTime();

        if (data.length && toSave < query.endTime) {
            this.config.fromTime = toSave;
            await this.scan();
        }
        return true;
    },

    save: async function(data) {
        const fromStr = new Date(data[0][0]).toISOString();
        const toStr = new Date(data.slice(-1)[0][0]).toISOString();
        console.log(`Saving into database. FROM: ${ fromStr }, TO: ${ toStr }`);

        const sql = `INSERT INTO candles (id, open, close, low, high, volume, tsopen, tsclose, samples) VALUES (:id,:open,:close,:low,:high,:volume,:tsOpen,:tsClose,:samples) ON DUPLICATE KEY UPDATE open = :open, close = :close, low = :low, high = :high, volume = :volume, tsopen = :tsOpen, tsclose = :tsClose, samples = :samples;`;
        
        const inserts = await Promise.all( data.map(async candle => {
            const data = {
                id: parseInt(candle[0] / 1000 / this.resolution),
                tsOpen: new Date(candle[0]),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5],
                tsClose: new Date(candle[6]),
                samples: candle[8],
            };

            return db.query(sql, data);
        }));

        inserts.forEach(([_,error]) => {
            if (error) {
                console.log(error);
                return;
            }
        });
    },
};

module.exports = config => {
    scanner.config = config;
    return scanner;
};
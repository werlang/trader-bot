const fetch = require('node-fetch');
const config = require('../config.json');

const exchange = {
    url: 'https://api.binance.com/api/v3',
    endpoint: 'klines',

    // receive timestamp and fetch data from exchange
    fetch: async function(fromTime, toTime) {
        const query = {
            symbol: config.exchange.symbol,
            interval: '1m',
            startTime: fromTime,
            endTime: toTime,
            limit: 1000,
        }

        const url = `${ this.url }/${ this.endpoint }?${ new URLSearchParams(query).toString() }`;
        const req = await fetch(url, {
            headers: { "X-MBX-APIKEY": config.exchange.apiKey }
        });
        const data = await req.json();
        // console.log(data)

        return this.format(data);
    },

    // format exchange data returned to standard information used by scanner module:
    // array [
    //     {
    //         tsOpen: Date,
    //         open: number,
    //         high: number,
    //         low: number,
    //         close: number,
    //         volume: number,
    //         tsClose: Date,
    //         samples: number,
    //     }
    //     ...
    // ]
    format: data => data.map(candle => ({
        tsOpen: new Date(candle[0]),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        tsClose: new Date(candle[6]),
        samples: candle[8],
    })),
}

module.exports = () => {
    return exchange;
};
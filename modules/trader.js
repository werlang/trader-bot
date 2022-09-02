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
        this.wallet.currency = this.config.startingBalance || 100;
        strategy.init();

        this.report.startingTime = new Date(this.config.fromTime).toISOString();
        this.report.endingTime = new Date(this.config.toTime).toISOString();

        this.report.startingBalance = this.wallet.currency;
        this.report.feePaid = 0;
        this.report.swaps = 0;

        strategy.started = true;

        this.data = await this.fetchData();
        if (!this.data) {
            this.running = false;
            return;
        }

        this.report.startingPrice = parseFloat(this.data[0].open);
        this.report.wallet = [];
        this.report.market = [];

        this.running = true;
        while(this.running) {
            await this.step();
        }

        this.showReport();
        Object.entries(this.report).forEach(([k,v]) => this.wsData[k] = v);

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
        this.report.market.push( candle.close );
        this.report.wallet.push( {...this.api.getWallet()} );
    },

    fetchData: async function() {
        const fromId = this.getCandleId(this.config.fromTime);
        const toId = this.getCandleId(this.config.toTime);
        
        const sql = `SELECT * FROM candles WHERE id BETWEEN ? AND ?`;
        const [ rows, error ] = await db.query(sql, [ fromId, toId ]);

        if (fromId != rows[0].id) {
            console.log(fromId , rows[0].id)
            if (this.config.verbose > 0) {
                console.log(`Candle not available: ${ this.getDateFromCandleId(fromId).toISOString() }`)
            }
            return false;
        }
        if (toId != rows[rows.length-1].id) {
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

    showReport: function() {
        this.report.endingBalance = this.wallet.currency + this.wallet.asset * this.api.candle.close;
        this.report.endingPrice = this.api.candle.close;

        const walletProfit = this.report.endingBalance / this.report.startingBalance;
        const marketProfit = this.report.endingPrice / this.report.startingPrice;
        this.report.marketProfit = (marketProfit - 1) * 100;
        this.report.walletProfit = (walletProfit - 1) * 100;

        this.report.period = (new Date(this.config.toTime).getTime() - new Date(this.config.fromTime).getTime()) / 1000 / 3600 / 24;
        
        const apr = Math.pow(walletProfit, 1 / this.report.period);
        const apy = Math.pow(apr, 365);
        this.report.apr = (apr - 1) * 100;
        this.report.apy = (apy - 1) * 100;
        

        const pa = require('portfolio-analytics');
        const riskFreeArray = (size => {
            const arr = Array(size).fill(0);
            for (let i in arr) {
                let aprm = Math.pow(1.01, 1/30/24/60); // apr each minute
                arr[i] = i == 0 ? this.report.startingBalance : arr[i-1] * Math.pow(aprm, this.config.timeframe);
            }
            return arr;
        })(this.report.wallet.length);
        const balance = this.report.wallet.map((e,i) => e.currency + e.asset * this.report.market[i]);
        this.report.sharpe = pa.sharpeRatio(balance, riskFreeArray);
        this.report.drawDown = pa.maxDrawdown(balance);

        let msg = `\n\n\t--- TRADING SUMMARY ---\n\n`;
        msg += `Starting time: \t\t${this.report.startingTime}\n`;
        msg += `Ending time: \t\t${this.report.endingTime}\n`;
        msg += `Period: \t\t${this.report.period} days\n\n`;

        msg += `Starting price: \t$${this.report.startingPrice.toFixed(2)}\n`;
        msg += `Ending price: \t\t$${this.report.endingPrice.toFixed(2)}\n`;
        msg += `Profit if HODLing: \t${this.report.marketProfit.toFixed(4)}%\n\n`;
        
        msg += `Starting balance: \t$${this.report.startingBalance.toFixed(2)}\n`;
        msg += `Ending balance: \t$${this.report.endingBalance.toFixed(2)}\n`;
        msg += `Strategy profit: \t${this.report.walletProfit.toFixed(4)}%\n\n`;
        
        msg += `Num. Swaps: \t\t${this.report.swaps}\n`;
        msg += `Fee paid: \t\t$${this.report.feePaid.toFixed(2)}\n\n`;

        msg += `APR: \t\t\t${this.report.apr.toFixed(4)}%\n`;
        msg += `APY: \t\t\t${this.report.apy.toFixed(4)}%\n\n`;
        msg += `Sharpe ratio: \t\t${this.report.sharpe.toFixed(4)}\n`;
        msg += `Max. Drawdown: \t\t${this.report.drawDown.toFixed(4)}\n`;
        console.log(msg);
    },
};

module.exports = (config, wsData) => {
    trader.config = config;
    trader.wsData = wsData;
    return trader;
}
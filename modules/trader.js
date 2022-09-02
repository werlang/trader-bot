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
        this.report.startingBalance = this.wallet.currency;
        this.report.feePaid = 0;
        this.report.swaps = 0;

        strategy.started = true;

        this.data = await this.fetchData();

        this.report.startingPrice = parseFloat(this.data[0].open);
        this.report.moment = [];

        this.running = true;
        while(this.running) {
            await this.step();
        }

        this.showReport();

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
        this.report.moment.push( this.api.getWalletBalance() );
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
        const riskFreeArray = (data => {
            const arr = Array(data.length).fill(0);
            for (let i in arr) {
                let aprm = Math.pow(1.01, 1/30/24/60); // apr each minute
                arr[i] = i == 0 ? this.report.startingBalance : arr[i-1] * Math.pow(aprm, this.config.timeframe);
            }
            return arr;
        })(this.report.moment);
        this.report.sharpe = pa.sharpeRatio(this.report.moment, riskFreeArray);
        this.report.drawDown = pa.maxDrawdown(this.report.moment);

        let msg = `\n\n\t--- TRADING SUMMARY ---\n\n`;
        msg += `Starting time: \t\t${this.config.fromTime}\n`;
        msg += `Ending time: \t\t${this.config.toTime}\n`;
        msg += `Period: \t\t${this.report.period} days\n\n`;

        msg += `Starting price: \t$${this.report.startingPrice.toFixed(2)}\n`;
        msg += `Ending price: \t\t$${this.report.endingPrice.toFixed(2)}\n`;
        msg += `Profit if HODLing: \t${this.report.marketProfit.toFixed(4)}%\n\n`;
        
        msg += `Starting balance: \t$${this.report.startingBalance.toFixed(2)}\n`;
        msg += `Ending balance: \t$${this.report.endingBalance.toFixed(2)}\n`;
        msg += `Strategy profit: \t${this.report.walletProfit.toFixed(4)}%\n\n`;
        
        msg += `Swaps: \t\t\t${this.report.swaps}\n`;
        msg += `Fee paid: \t\t$${this.report.feePaid.toFixed(2)}\n\n`;

        msg += `APR: \t\t\t${this.report.apr.toFixed(4)}%\n`;
        msg += `APY: \t\t\t${this.report.apy.toFixed(4)}%\n\n`;
        msg += `Sharpe: \t\t${this.report.sharpe.toFixed(4)}\n`;
        msg += `Drawdown: \t\t${this.report.drawDown.toFixed(4)}\n`;
        console.log(msg);
    },
};

module.exports = config => {
    trader.config = config;
    return trader;
}
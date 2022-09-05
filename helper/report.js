const report = {
    info: {},

    init: function(config, wallet) {
        this.info.startingTime = new Date(config.fromTime).toISOString();
        this.info.endingTime = new Date(config.toTime).toISOString();
        this.info.period = (new Date(config.toTime).getTime() - new Date(config.fromTime).getTime()) / 1000 / 3600 / 24;

        this.timeframe = config.timeframe;

        this.info.startingBalance = config.startingBalance;
        this.info.feePaid = 0;
        this.info.swaps = [];
        this.info.wallet = [];
        this.info.market = [];
    },

    set: function(key, data) {
        this.info[key] = data;
    },

    append: function(arr, data) {
        this.info[arr].push(data);
    },

    get: function(key) {
        return this.info[key];
    },

    add: function(key, value) {
        this.info[key] += value;
    },

    show: function() {
        const lastWalletInfo = this.info.wallet[ this.info.wallet.length-1 ];
        this.info.endingPrice = this.info.market[ this.info.market.length-1 ];
        this.info.endingBalance = lastWalletInfo.currency + lastWalletInfo.asset * this.info.endingPrice;

        const walletProfit = this.info.endingBalance / this.info.startingBalance;
        const marketProfit = this.info.endingPrice / this.info.startingPrice;
        this.info.marketProfit = (marketProfit - 1) * 100;
        this.info.walletProfit = (walletProfit - 1) * 100;

        const apr = Math.pow(walletProfit, 1 / this.info.period);
        const apy = Math.pow(apr, 365);
        this.info.apr = (apr - 1) * 100;
        this.info.apy = (apy - 1) * 100;

        const pa = require('portfolio-analytics');
        const riskFreeArray = (size => {
            const arr = Array(size).fill(0);
            for (let i in arr) {
                let aprm = Math.pow(1.01, 1/30/24/60); // apr each minute
                arr[i] = i == 0 ? this.info.startingBalance : arr[i-1] * Math.pow(aprm, this.timeframe);
            }
            return arr;
        })(this.info.wallet.length);

        const balance = this.info.wallet.map((e,i) => e.currency + e.asset * this.info.market[i]);
        this.info.sharpe = pa.sharpeRatio(balance, riskFreeArray);
        this.info.drawDown = pa.maxDrawdown(balance);

        let msg = `\n\n\t--- TRADING SUMMARY ---\n\n`;
        msg += `Starting time: \t\t${this.info.startingTime}\n`;
        msg += `Ending time: \t\t${this.info.endingTime}\n`;
        msg += `Period: \t\t${this.info.period} days\n\n`;

        msg += `Starting price: \t$${this.info.startingPrice.toFixed(2)}\n`;
        msg += `Ending price: \t\t$${this.info.endingPrice.toFixed(2)}\n`;
        msg += `Profit if HODLing: \t${this.info.marketProfit.toFixed(4)}%\n\n`;
        
        msg += `Starting balance: \t$${this.info.startingBalance.toFixed(2)}\n`;
        msg += `Ending balance: \t$${this.info.endingBalance.toFixed(2)}\n`;
        msg += `Strategy profit: \t${this.info.walletProfit.toFixed(4)}%\n\n`;
        
        msg += `Num. Swaps: \t\t${this.info.swaps.length}\n`;
        msg += `Fee paid: \t\t$${this.info.feePaid.toFixed(2)}\n\n`;

        msg += `APR: \t\t\t${this.info.apr.toFixed(4)}%\n`;
        msg += `APY: \t\t\t${this.info.apy.toFixed(4)}%\n\n`;
        msg += `Sharpe ratio: \t\t${this.info.sharpe.toFixed(4)}\n`;
        msg += `Max. Drawdown: \t\t${this.info.drawDown.toFixed(4)}\n`;
        console.log(msg);
    },

    serveWeb: function(data) {
        Object.entries(this.info).forEach(([k,v]) => data[k] = v);
    }
}

module.exports = (config, wallet) => {
    report.init(config, wallet);
    return report;
}
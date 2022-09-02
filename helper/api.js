const api = {
    // swap value * currency for asset
    swap: function(amount, currency=true) {
        const price = api.candle.close;

        if (currency && api.wallet.currency < amount) {
            if (api.verbose > 0) {
                console.log('Not enough currency balance to perform trader swap.');
            }
            return false;
        }

        if (!currency && api.wallet.asset < amount) {
            if (api.verbose > 0) {
                console.log('Not enough asset balance to perform this swap.');
            }
            return false;
        }

        const swapFee = amount * api.swapFee;

        if (currency) {
            api.wallet.currency -= amount;
            api.wallet.asset += (amount - swapFee) / price;
            api.traderReport.feePaid += swapFee;
        }
        else {
            api.wallet.asset -= amount;
            api.wallet.currency += (amount - swapFee) * price;
            api.traderReport.feePaid += swapFee * price;
        }

        api.traderReport.swaps++;

        if (api.verbose > 1) {
            let msg = api.candle.tsclose.toISOString() + '\t';
            msg += `SWAPPED: ${ amount.toFixed(8) } ${ currency ? 'C' : 'A' } @ ${ price }\t`;
            msg += `WALLET: (A) ${ api.wallet.asset.toFixed(8) }, (C) ${ api.wallet.currency.toFixed(2) }\t`;
            msg += `TOTAL BALANCE: $${ (api.getWalletBalance()).toFixed(2) }`;
            console.log(msg);
        }
        return true;
    },

    setWalletBalance: function(value) {
        if (api.strategy.started) {
            if (api.verbose > 0) {
                console.log('setWalletBalance method only allowed inside init');
            }
            return false;
        }

        api.wallet.currency = value;
    },

    getWallet: function() {
        return api.wallet;
    },

    getWalletBalance: function() {
        return api.wallet.currency + api.wallet.asset * api.candle.close;
    },
}

module.exports = (trader, strategy) => {
    strategy.setWalletBalance = api.setWalletBalance;
    strategy.getWallet = api.getWallet;
    strategy.getWalletBalance = api.getWalletBalance;
    strategy.swap = api.swap;
    api.strategy = strategy;

    api.wallet = trader.wallet;
    api.verbose = trader.config.verbose;
    api.swapFee = trader.config.swapFee;
    trader.report = {};
    api.traderReport = trader.report;

    return api;
};
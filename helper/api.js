const api = {
    init: function() {
        api.strategy.setWalletBalance = api.setWalletBalance;
        api.strategy.getWallet = api.getWallet;
        api.strategy.swap = api.swap;
    },

    // swap value * currency for asset
    swap: function(amount, currency=true) {
        const price = api.candle.close;

        if (currency && api.wallet.currency < amount) {
            console.log('Not enough currency balance to perform this swap.');
            return false;
        }

        if (!currency && api.wallet.asset < amount) {
            console.log('Not enough asset balance to perform this swap.');
            return false;
        }

        if (currency) {
            api.wallet.currency -= amount;
            api.wallet.asset += amount / price;
        }
        else {
            api.wallet.asset -= amount;
            api.wallet.currency += amount * price;
        }

        let msg = api.candle.tsclose.toISOString() + '\t';
        msg += `SWAPPED: ${ amount.toFixed(8) } ${ currency ? 'C' : 'A' } @ ${ price }\t`;
        msg += `WALLET: (A) ${ api.wallet.asset.toFixed(8) }, (C) ${ api.wallet.currency.toFixed(2) }\t`;
        msg += `TOTAL BALANCE: $${ (api.wallet.currency + api.wallet.asset * price).toFixed(2) }`;
        console.log(msg);
        return true;
    },

    setWalletBalance: function(value) {
        if (api.strategy.started) {
            console.log('setWalletBalance method only allowed inside init');
            return false;
        }

        api.wallet.currency = value;
    },

    getWallet: function() {
        return api.wallet;
    },
}

module.exports = (trader, strategy) => {
    api.strategy = strategy;
    api.init();
    api.wallet = trader.wallet;
    return api;
};
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

        console.log(`Swapped: ${ amount } ${ currency ? 'C' : 'A' } @ ${ price }`);
        console.log(`Wallet: ${ JSON.stringify(api.wallet) }`);
        console.log(`Total balance: $${ api.wallet.currency + api.wallet.asset * price }`);
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
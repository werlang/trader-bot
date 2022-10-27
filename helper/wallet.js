const config = require('../config.json');
const web3 = require('./web3');

const wallet = {
    currency: {
        balance: 0,
        get: async () => wallet.get().currency,
        add: async value => wallet.add('currency', value),
        setInfo: obj => wallet.setInfo('currency', obj),
    },

    asset: {
        balance: 0,
        get: async () => wallet.get().asset,
        add: async value => wallet.add('asset', value),
        setInfo: obj => wallet.setInfo('asset', obj),
    },

    add: async function(key, value) {
        this[key].balance += value;
        return this[key].balance;
    },

    get: async function() {
        const balance = {
            asset: this.asset.balance,
            currency: this.currency.balance,
        };

        if (this.mode == 'live') {
            balance.asset = web3.toEth(await web3.getTokenBalance(config.dex.wallet, this.asset.address), this.asset.decimals);
            balance.currency = web3.toEth(await web3.getTokenBalance(config.dex.wallet, this.currency.address), this.currency.decimals);
        }

        return balance;
    },

    setInfo: function(key, obj) {
        this[key].address = obj.address;
        this[key].decimals = obj.decimals;
    }
}

module.exports = async (mode='live') => {
    wallet.mode = mode;
    wallet.currency.balance = config.startingBalance || 100;

    if (mode == 'live') {
        const dex = await require('../dex/'+ config.dex.name);
        // Network ID. (Mainnet - 1, Ropsten - 3, Polygon - 137, BSC - 56, Avalanche - 43114)
        await dex.init();
        wallet.asset.setInfo(dex.asset);
        wallet.currency.setInfo(dex.currency);
    }
    return wallet;
}
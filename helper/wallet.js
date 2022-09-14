const config = require('../config.json');

const wallet = {
    balance: {
        currency: 0,
        asset: 0,
    },

    currency: {
        get: async () => this.get().currency,
        add: async value => wallet.add('currency', value),
    },

    asset: {
        get: async () => this.get().asset,
        add: async value => wallet.add('asset', value),
    },

    add: async function(key, value) {
        this.balance[key] += value;
        return this.balance;
    },

    get: async function() {
        return this.balance;
    },
}

module.exports = async (mode) => {
    wallet.mode = mode;
    wallet.balance.currency = config.startingBalance || 100;
    return wallet;
}
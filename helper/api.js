const config = require('./config');

const api = {
    // swap value * currency for asset
    swap: async function(amount, currency=true) {
        const price = api.candle.close;
        const wallet = await api.wallet.get();

        if (currency && wallet.currency < amount) {
            if (api.verbose > 0) {
                console.log('Not enough currency balance to perform trader swap.');
            }
            return false;
        }

        if (!currency && wallet.asset < amount) {
            if (api.verbose > 0) {
                console.log('Not enough asset balance to perform this swap.');
            }
            return false;
        }

        const swapFee = amount * api.swapFee;

        if (currency) {
            await api.wallet.currency.add(-amount);
            await api.wallet.asset.add((amount - swapFee) / price);
            api.traderReport.add('feePaid', swapFee);
        }
        else {
            await api.wallet.asset.add(-amount);
            await api.wallet.currency.add((amount - swapFee) * price);
            api.traderReport.add('feePaid', swapFee * price);
        }

        api.traderReport.append('swaps', {
            time: api.candle.tsopen,
            price: price,
            amount: amount,
            currency: currency,
        });

        if (api.verbose > 1) {
            const wallet = await api.wallet.get();
            let msg = api.candle.tsclose.toISOString() + '\t';
            msg += `SWAPPED: ${ amount.toFixed(8) } ${ currency ? 'C' : 'A' } @ ${ price }\t`;
            msg += `WALLET: (A) ${ wallet.asset.toFixed(8) }, (C) ${ wallet.currency.toFixed(2) }\t`;
            msg += `TOTAL BALANCE: $${ (await api.getWalletBalance()).toFixed(2) }`;
            console.log(msg);
        }
        return true;
    },

    getWallet: async function() {
        return await api.wallet.get();
    },

    getWalletBalance: async function() {
        const wallet = await api.wallet.get();
        return wallet.currency + wallet.asset * api.candle.close;
    },
}

module.exports = (trader, strategy) => {
    strategy.getWallet = api.getWallet;
    strategy.getWalletBalance = api.getWalletBalance;
    strategy.swap = api.swap;
    api.strategy = strategy;

    api.wallet = trader.wallet;
    api.verbose = config().verbose;
    api.swapFee = config().swapFee;
    api.traderReport = trader.report;

    return api;
};
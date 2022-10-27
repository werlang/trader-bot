const config = require('../config.json');
const wallet = require('../helper/wallet');
const dex = require('../dex/'+ config.dex.name);

const api = {
    // swap value * currency for asset
    swap: async function(amount, currency=true) {
        if (!api.strategy.started) {
            console.log('Swaps should not be called on the init method');
            return false;
        }

        const price = api.candle.close;
        const wallet = await api.wallet.get();

        if (currency && wallet.currency < amount) {
            if (config.verbose > 0) {
                console.log('Not enough currency balance to perform trader swap.');
            }
            return false;
        }

        if (!currency && wallet.asset < amount) {
            if (config.verbose > 0) {
                console.log('Not enough asset balance to perform this swap.');
            }
            return false;
        }

        if (api.mode == 'live') {
            // make the swap
            const receipt = await dex.swap(amount, currency);
            api.traderReport.add('feePaid', 0);
        }
        else {
            // simulate the swap changing the wallet balances
            const swapFee = amount * config.swapFee;
    
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
        }

        api.traderReport.append('swaps', {
            time: api.candle.tsopen,
            price: price,
            amount: amount,
            currency: currency,
        });

        if (config.verbose > 1) {
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

    // get candle history. All candles since trading started are available.
    // 0 || 'start' = first candle          'now' = last available candle
    // 0,1,2,3...n = nth candle             -1,-2,-3,-4...-n = nth candle starting from end
    getHistory: function(fromTime='start', toTime='now') {
        // first history point
        if (fromTime == 'start') {
            fromTime = 0;
        }
        // last history point
        if (toTime == 'now') {
            toTime = api.history.length - 1;
        }

        // pick last available position
        if (fromTime >= 0 && !api.history[fromTime]) {
            fromTime = api.history.length - 1;
        }
        if (fromTime < 0 && !api.history[ api.history.length + fromTime]) {
            fromTime = 0;
        }

        if (toTime >= 0 && !api.history[toTime]) {
            toTime = api.history.length - 1;
        }
        if (toTime < 0 && !api.history[ api.history.length + toTime]) {
            toTime = 0;
        }

        // get real position if negative
        if (fromTime < 0) {
            fromTime = api.history.length - Math.abs(fromTime);
        }
        if (toTime < 0) {
            toTime = api.history.length - Math.abs(toTime);
        }

        return api.history.filter((_,i) => i >= fromTime && i <= toTime);
    },
}

module.exports = async (trader, strategy) => {
    strategy.getWallet = api.getWallet;
    strategy.getWalletBalance = api.getWalletBalance;
    strategy.swap = api.swap;
    strategy.getHistory = api.getHistory;
    api.strategy = strategy;

    api.wallet = await wallet(trader.mode);
    api.traderReport = trader.report;
    api.history = [];
    api.mode = trader.mode;

    return api;
};
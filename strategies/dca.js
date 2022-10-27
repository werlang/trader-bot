// -------------------------------
// >>>   DCA sample strategy   <<<
// -------------------------------

// >>>   INTRODUCTION   <<<
// You must export an object containing init and update methods:
// init: Code that will be executed only once, before the strategy is run.
// update: at every time interval (timeframe) the update method will be called.

// >>>   CANDLE   <<<
// The update method receives a candle argument, containing information about the current candle:
// {
//     tsopen: (Date): Starting time of this candle
//     tsclose: (Date): Ending time of this candle
//     open: (Number): Asset price when the candle started
//     close: (Number): Asset price when the candle ended
//     low: (Number): Lowest asset price seen on the entire candle timeframe
//     high: (Number): Highest asset price seen on the entire candle timeframe
//     volume: (Number): Volume of asset traded during this candle timeframe
//     samples: (Number): Number of lower timeframe candles composing this entire candle
// }

// >>>   API   <<<
// you can use the following methods inside your strategy:
// getWallet():
//     Returns an object representing the amount of currency and asset in the wallet:
//     { asset: 0.0, currency: 0.0 }
// getWalletBalance():
//     Same as getWallet, but returns a single number, representing the sum of currency and asset, converted to currency
// getHistory(fromTime='start', toTime='end'):
//     Return an array of candles between fromTime and toTime. Both arguments can be positive or negative.
//     Values from 0...N represent the desired nth candle since the strategy started
//     Values from -N...-1 represent the desired nth candle, decresing. (-1 is the last candle).
//     fromTime can also be 'start': This is the same as 0.
//     toTime can also be 'end' or undefined: This is the same as -1.
// swap(amount, currency=true):
//     Make the swap. If on live trade, will call the dex and web3 to write the tx on the blockchain
//     amount is a positive number indicating the amount of tokens you are willing to sell.
//     currency == true means that you are willing to sell the currency for asset.
//     currency == false means that you are willing to sell the asset for currency.
// buy(amount):
//     Alias for swap(amount, true)
// sell(amount):
//     Alias for swap(amount, false)
module.exports = {

    init: async function() {
        this.maxHistoryLength = 24;
        this.cooldown = 0;
        this.tradingThreshold = 0.15;
        this.tradingAmount = 0.3;
        return;
    },

    update: async function(candle) {
        this.cooldown--;
        if (this.cooldown > 0) return;

        const history = this.getHistory(-this.maxHistoryLength);
        // get change in last 24h
        let change = (history[history.length-1].close - history[0].close);
        change = change / history[0].close;
        
        // change over positive in period, sell asset
        if (change >= this.tradingThreshold) {
            const amount = this.tradingAmount * (await this.getWallet()).asset;
            await this.swap(amount, false);
            this.cooldown = this.maxHistoryLength;
        }
        // change below negative in period, buy asset
        else if (change <= -this.tradingThreshold) {
            const amount = this.tradingAmount * (await this.getWallet()).currency;
            await this.swap(amount, true);
            this.cooldown = this.maxHistoryLength;
        }

        return;
    }
}
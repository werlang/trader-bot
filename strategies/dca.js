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
// There are several methods you can use inside your strategy, to know about and control things like time, wallet info, swaps, and the like.
// Go to https://github.com/werlang/trader-bot and have a good look on all of them.

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
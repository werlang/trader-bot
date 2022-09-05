const strategy = {

    init: async function() {
        this.history = [];
        this.maxHistoryLength = 24;
        this.tradingThreshold = 0.15;
        this.tradingAmount = 0.3;
        return;
    },

    update: async function(candle) {
        // record candle history of 24h
        this.history.push(candle);
        if (this.history.length < this.maxHistoryLength) {
            return;
        }

        this.history.shift();

        // get change in last 24h
        let change = (this.history[this.history.length-1].close - this.history[0].close);
        change = change / this.history[0].close;
        
        // change over positive in period, sell asset
        if (change >= this.tradingThreshold) {
            const amount = this.tradingAmount * (await this.getWallet()).asset;
            await this.swap(amount, false);
            this.history = [];
        }
        // change below negative in period, buy asset
        else if (change <= -this.tradingThreshold) {
            const amount = this.tradingAmount * (await this.getWallet()).currency;
            await this.swap(amount, true);
            this.history = [];
        }

        return;
    }
}

module.exports = strategy;
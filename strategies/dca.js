const strategy = {

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

module.exports = strategy;
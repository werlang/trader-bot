const strategy = {
    side: true, 

    init: function() {
        console.log('strategy started');

        this.setWalletBalance(100);
    },

    update: function(candle) {
        const amount = 10;
        const r = this.swap(this.side ? amount : amount / candle.close, this.side);
        if (!r) this.side = !this.side;
    }
}

module.exports = strategy;
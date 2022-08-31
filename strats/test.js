const strategy = {
    init: function() {
        console.log('strategy started');
    },

    update: function(candle) {
        // console.log(candle);

        this.open(100);
    }
}

module.exports = strategy;
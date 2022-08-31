const strategy = {
    init: function() {
        console.log('strategy started');
    },

    update: function(candle) {
        console.log(candle);
    }
}

module.exports = strategy;
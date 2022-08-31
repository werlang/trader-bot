const api = {
    init: function(strategy) {
        strategy.open = this.open;
        strategy.close = this.close;
        strategy.getPosition = this.getPosition;
        strategy.getBalance = this.getBalance;
    },

    open: function(size) {
        const price = api.trader.candleData.close;

        api.trader.position += size / price;
        api.trader.wallet -= size;
        console.log(`Opened position: ${ size / price } @ ${ price }`);
        console.log(`Current position: ${ api.trader.position }`);
        console.log(`Current balance: $${ api.trader.wallet }`);
        console.log(`Liquid balance: $${ api.trader.wallet + api.trader.position * price }`);
    },

    close: function(size) {
        console.log(size)
    },

    getPosition: function() {
        return api.trader.position;
    },

    getBalance: function() {
        return api.trader.wallet;
    },
}

module.exports = (trader, strategy) => {
    api.init(strategy);
    api.trader = trader;
    return api;
};
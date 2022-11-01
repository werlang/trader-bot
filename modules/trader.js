const config = require('../config.json');
const report = require('../view/report');
const api = require('./api');
const candleBuilder = require('./candleBuilder');

const trader = {
    trade: async function() {
        this.currentCandle = new Date(config.fromTime);
        
        this.strategy = require(`../strategies/${ config.strategy }`);
        this.report = report();

        this.data = [];
        this.api = await api(this, this.strategy);

        this.report.serveWeb(this.wsData);
        this.report.set('timeframe', config.timeframe);

        candleBuilder.init(this);
        await this.strategy.init();

        if (this.mode == 'backtest') {
            console.log('Running Backtest...');
            await candleBuilder.queryData(config.fromTime, config.toTime);
            if (!this.data.length) {
                this.running = false;
                return false;
            }
            this.report.set('startingTime', this.data[0].tsopen);
        }
        else if (this.mode == 'paper' || this.mode == 'live') {
            // fetch data for building history window
            console.log('Getting data for history window.');
            const fromTime = new Date().getTime() - config.historySize * 1000 * 60 * config.timeframe;
            await candleBuilder.queryData(fromTime, new Date());
            if (!this.data.length) {
                this.running = false;
                return false;
            }

            // history window: run steps without allowing strategy update
            this.report.set('startingTime', this.data[0].tsopen);
            this.currentCandle = this.data[0].tsopen;
            const startingWallet = await this.api.getWallet();
            while (this.currentCandle < new Date(this.data[ this.data.length-1 ].tsclose)) {
                const candle = await candleBuilder.buildCandle();
                this.api.history.push( this.api.historyCallback ? this.api.historyCallback(candle) : candle );
                this.report.append('market', candle.close );
                this.report.append('wallet', { ...startingWallet } );
                this.report.set('endingTime', candle.tsclose);
                this.report.updateIndicatorView(candle);
            }
            console.log(`Ready to trade... ${ this.mode == 'paper' ? 'On paper!' : ''}`);
        }
        else {
            console.log('This mode is not recognized');
            return false;
        }

        this.strategy.started = true;

        this.running = true;
        while(this.running) {
            await this.step();
        }

        this.report.set('endingTime', this.data[ this.data.length-1 ].tsclose);
        this.report.show();

        return true;
    },

    step: async function() {
        const candle = await candleBuilder.buildCandle();
        if (!candle) {
            this.running = false;
            return false;
        };

        this.api.candle = candle;
        this.api.history.push( this.api.historyCallback ? this.api.historyCallback(candle) : candle );
        await this.strategy.update(candle);
        this.report.append('market', candle.close );
        this.report.append('wallet', { ...(await this.api.getWallet()) } );
        // for each indicator view, update data with candle info
        this.report.updateIndicatorView(candle);
        this.report.set('endingTime', this.data[ this.data.length-1 ].tsclose);
    },
};

module.exports = async ({ webServerData, mode }) => {
    trader.wsData = webServerData;
    trader.mode = mode;
    
    console.log('Trader module loaded');
    return await trader.trade();
}
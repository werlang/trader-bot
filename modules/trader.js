const config = require('../helper/config');
const wallet = require('../helper/wallet');
const report = require('../helper/report');
const api = require('../helper/api');
const candleBuilder = require('../helper/candleBuilder');

const trader = {
    trade: async function() {
        this.currentCandle = new Date(config().fromTime);
        
        this.wallet = await wallet(this.mode);
        this.strategy = require(`../strategies/${ config().strategy }`);
        this.report = report();
        this.api = api(this, this.strategy);

        this.report.serveWeb(this.wsData);
        this.report.set('timeframe', config().timeframe);

        await this.strategy.init();
        this.strategy.started = true;

        this.data = [];
        candleBuilder.init(this);

        if (this.mode == 'backtest') {
            await candleBuilder.queryData(config().fromTime, config().toTime);
            if (!this.data.length) {
                this.running = false;
                return false;
            }
            this.report.set('startingTime', this.data[0].tsopen);
        }
        else if (this.mode == 'live') {
            this.dex = require('../dex/'+ config().dex.name)(1);
            console.log(await this.dex.swap(0.01, false));

            return false;
        }
        else if (this.mode == 'paper') {
            // fetch data for building history window
            const fromTime = new Date().getTime() - config().historySize * 1000 * 60 * config().timeframe;
            await candleBuilder.queryData(fromTime, new Date());
            if (!this.data.length) {
                this.running = false;
                return false;
            }
            this.currentCandle = new Date(this.data[ this.data.length-1 ].tsclose);
            this.report.set('startingTime', this.data[ this.data.length-1 ].tsclose);
        }
        else {
            console.log('This mode is not recognized');
            return false;
        }

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
        await this.strategy.update(candle);
        this.report.append('market', candle.close );
        this.report.append('wallet', { ...(await this.api.getWallet()) } );
        this.report.set('endingTime', this.data[ this.data.length-1 ].tsclose);
    },
};

module.exports = async ({ webServerData, mode }) => {
    trader.wsData = webServerData;
    trader.mode = mode;
    
    console.log('Trader module loaded');
    return await trader.trade();
}
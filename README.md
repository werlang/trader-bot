# trader-bot

This is a simple trading bot made with the following goals in mind:
* Easy to create a strategy. With a regular js object and a handful of API methods, you can get market data, wallet balances, and perform swaps.
* Easy to extend. You can add new exchanges and dexes on new modules, increasing the bot's reach.
* Full package. You can scan data from exchanges, run backtests, live or paper trade, and monitor strategy performance on the web.


## Disclaimer

I created this bot for personal use, and there may have bugs in it. So if you like this code and decide to use it, you are accepting the risk. If you lose money because of any bug, that is on you.

I provide this code "as-is" with no guarantee of support of any kind. If you find any issue in the code, you may open a new issue on this repo, and I will check it on my own time.

# Getting it to work

Clone this repo

```
git clone https://github.com/werlang/trader-bot.git
```

Install dependencies

```
npm i
```

Create the SQL database (needed to save the data fetched from exchange):

**If you do not have a SQL server installed on your machine, go install it first**

```
mysql -u <DB_USER> -p
mysql> create database <DB_NAME>;
mysql> use <DB_NAME>;
mysql> source asset/database.sql;
```

Rename (or copy then rename) [.env.example](.env.example) file to `.env`. Then fill its contents according to your db configuration:

```
DB_USER="root"
DB_PORT=3306
DB_HOST="localhost"
DB_DATABASE="trader_db"
DB_PASSWORD="root_password"
WEBSERVER_PORT=3000
```

Rename (or copy then rename) [config.json.example](config.json.example) file to `config.json`. Then fill its contents according to your db configuration:

```json
{
    "fromTime": "2021-01-01 00:00:00.000",
    "toTime": "2021-12-21 00:00:00.000",
    "exchange": {
        "name": "binance",
        "apiKey": "YOUR_API_KEY",
        "symbol": "ETHUSDT"
    },
    "dex": {
        "network": "ethereum",
        "name": "paraswap",
        "asset": "ETH",
        "currency": "USDT",
        "wallet": "YOUR_WALLET_ADDRESS",
        "private": "YOUR_WALLET_PRIVATE_KEY"
    },
    "telegram": {
        "enabled": false,
        "token": "TELEGRAM_BOT_TOKEN",
        "chatId": "CHAT_ID"
    },
    "timeframe": 60,
    "strategy": "dca",
    "verbose": 2,
    "startingBalance": 1000,
    "swapFee": 0.002,
    "historySize": 720
}
```

Now you can run the bot using one of the modes:

* Scanner: `npm run scanner`
* Backtest: `npm run backtest`
* Paper trade: `npm run paper`
* Live trade: `npm start`

# Understanding `config.json`

Here is the descriptions of every field:

* `fromTime`: Time you will start to scan for candles. Used for scanner and backtest modes.
* `toTime`: Time your candle scanning will end. Used for scanner and backtest modes.
* `exchange.name`: Name of module under the `exchange` folder for interacting with exchange.
* `exchange.apiKey`: API key on the exchange.
* `exchange.symbol`: Which pair should be scanned on the exchange.
* `dex.network`: Chain's network name.
* `dex.name`: Name of module under the `dex` folder for interacting with the dex platform.
* `dex.asset`: Token name for the asset you are wanting to trade.
* `dex.currency`: Token name for the currency you are wanting to trade the asset for.
* `dex.wallet`: Your wallet address that will interact with the blockchain.
* `dex.private`: Your wallet's private key.
* `telegram.enabled`: Enable or disable Telegram alerts for swaps.
* `telegram.token`: Telegram bot's token that will send alerts.
* `telegram.chatId`: Telegram chat id of the group/user the bot will send alerts to.
* `timeframe`: The amount of minutes for each candle. The time frame for your trades.
* `strategy`: Name of your file under the `strategies` folder containing your strategy.
* `verbose`: Amount of details you are willing the console to show (0-2);
* `startingBalance`: The amount of currency your wallet will have at start. Used for backtest and paper trade only.
* `swapFee`: The percentage of the swapped value that will be paid as platform fee at every swap. Used for backtest and paper trade only.
* `historySize`: Amount of candles that will be loaded as historical data before your strategy start to run. Used for paper and live trade only.

# Modes overview

There are four main modes: scanner, backtest, paper trade and live trade.

## Scanner

```
npm run scanner
```

This mode is used to fetch candle data information from the exchange. First you will need to change `config.json`'s `fromTime` and `toTime` field.

The scanner module will check the database, and for all candles missing in the given interval, it will use your exchange API key to fetch data from the exchange, then save the candle on the database.

## Backtest

```
npm run backtest
```

This mode uses the same datetime interval as the scanner module. But this time it simulates trades on that interval.

It loads your strategy `strategy` field from `config.json`.
Before running anything, it will call the `init()` method form your strategy.

You will receive a custom amount of fake curerency in your wallet (determined by the `startingBalance` field in the config) for this simulation.

After that, at each candle interval, defined by the `timeframe` field form config, it will call the `update()` method from your strategy. The update method received a `candle` argument, that can be used inside your strategy.

Since this is a simulations, any swap performed by the strategy in this mode will affect only the fake currency and asset present in your wallet.

Check the [dca.js](strategies/dca.js) strategy for a general idea about how strategies should be built.

If at any time, the needed candle is not available on memory, it will be fetched from the database. If it is not available on the database, it will be fetched from the exchange.

After the backtest is run, you will see a report of your trades on the console:

```
        --- TRADING SUMMARY ---

Starting time:          2022-05-06T00:00:00.000Z
Ending time:            2022-09-05T23:59:59.999Z
Period:                 122 days

Starting price:         $2737.67
Ending price:           $1617.80
Profit if HODLing:      -40.9060%

Starting balance:       $1000.00
Ending balance:         $1046.35
Strategy profit:        4.6349%

Num. Swaps:             6
Fee paid:               $2.18

APR:                    0.0368%
APY:                    14.3905%

Sharpe ratio:           0.0024
Max. Drawdown:          0.2374
```

While on backtest, paper or live trade, the bot will launch by default a web server, allowing you to check in real time how your strategy is doing.

Check the port used by the webserver in the `.env` file, go to a web browser, and type:

```
http://localhost:PORT
```

![image](https://user-images.githubusercontent.com/19828711/199817800-d44caf5b-5e6a-43f0-a04c-fcb15f4b7bfb.png)

## Paper trade

```
npm run paper
```

On this mode, market watching will be made from live data, but you will only trade with fake currency and asset, like in the backtest mode.

Before anything, on this mode the bot will fetch some data from database (or exchange, in case it does not have available data) to compose the pre-trade data. The amount of candles is determined by the `historySize` on the config.

After that, the strategy will be started and run in the same way as in the backtest mode.

Since this mode will deal with live data, at each minute interval the bot will fetch a new candle from exchange.

Unlike the backtest, you can check the web server page to monitor your strategy while the strategy is still running. Just remember to refresh the page to update the data.

## Live trade

```
npm start
```

On this mode, just like on paper trade, you will trade on live data. But on live trade you will deal with real money.


Your wallet will be loaded on the bot using the `dex.wallet` and `dex.private` fields from config.

Every swap performed by your strategy will call the dex module and send the transaction to the blockchain.

**BEWARE: You can lose your fund while using live trade mode. Use this at your own risk.**

# API

To write your strategy, you will need to create a file under the `strategies` folder, then put its name on the `strategy` field on the config.

This strategy needs to export an object with at least two methods: `init` and `update`:

```js
module.exports = {
    init: async function() {
        // this is executed once, before start
    },

    update: async function(candle) {
        // this is executed at every time step
        // candle can be used to get current market data
    }
}
```

The argument `candle` from the `update` method is an object, containing current market data. It has the following fields:

* `tsopen`: *(Date)*: Starting time of this candle.
* `tsclose`: *(Date)*: Ending time of this candle.
* `open`: *(Number)*: Asset price when the candle started.
* `close`: *(Number)*: Asset price when the candle ended.
* `low`: *(Number)*: Lowest asset price seen on the entire candle timeframe.
* `high`: *(Number)*: Highest asset price seen on the entire candle timeframe.
* `volume`: *(Number)*: Volume of asset traded during this candle timeframe.
* `samples`: *(Number)*: Number of lower timeframe candles composing this entire candle.
  
Example:
```js
{
    tsopen: "2022-05-08T03:00:00.000Z",
    tsclose: "2022-05-08T03:59:59.999Z",
    open: 2549.51,
    close: 2545.08,
    low: 2517,
    high: 2553.29,
    volume: 67955.88060000002,
    samples: 76402
}
```

You can also create a `.json` file with the same name as your strategy file. The bot will automatically import it and expose its contents on `this.settings.FIELD`:

`myStrategy.json`
```json
{
    "myField": "value"
}
```

`myStrategy.js`
```js
strategy.update: async function(candle) {
    const field = this.settings.myField;
    console.log(field); // will print 'value'
}
```

There are a handful of methods you need to know about to create your own strategy:

## `getWallet()`: Promise\<Object>

Returns an object representing the amount of currency and asset in the wallet

```js
{
    asset: Number,
    currency: Number
}
```

## `getWalletBalance()`: Promise\<Number>

Same as getWallet, but returns a single number, representing the sum of currency and asset, converted to currency.

## `getHistory(fromTime='start', toTime='end')`: Array

Return an array of candles between `fromTime` and `toTime`. Both arguments can be positive or negative.

* Values from 0...N represent the desired nth candle since the strategy started.
* Values from -N...-1 represent the desired nth candle, decresing. (-1 is the last candle).
* `fromTime` can also be `'start'`: This is the same as 0.
* `toTime` can also be `'end'` or `undefined`: This is the same as -1.

## `setHistory(callback)`

Overrides the `candle` object received on the `update` method. This is very useful when you want to set custom values for the `candle` object at each step of your strategy (like setting custom indicator values for each candle), without needing to set it inside your `update` method.

The `callback` argument is a function with the following format:
```js
function callback(candle) {
    // your logic here
    return candle;
}
```

At each time step, your callback function will be called, and the returned candle will be replaced by the default candle value. Then you can use this custom candle inside your strategy.

Check this example:

```js
strategy.init = async function() {
    this.setHistory(candle => {
        candle.myField = myMethod();
        return candle;
    });
};

strategy.update = async function(candle) {
    // candle will have all regular fields, plus a myField value
    // that will receive the return of myMethod, called at each step.
};
```

## `swap(amount, currency=true)`: Promise\<Boolean>

Make the swap. If on live trade mode, the bot will call the dex and web3 to write the tx on the blockchain

* `amount` is a positive number indicating the amount of tokens you are willing to sell.
* `currency == true` means that you are willing to sell the currency for asset.
* `currency == false` means that you are willing to sell the asset for currency.

## `buy(amount)`: Promise\<Boolean>

Alias for `swap(amount, true)`.

## `sell(amount)`: Promise\<Boolean>

Alias for `swap(amount, false)`.

Check the [dca.js](strategies/dca.js) file to get a feeling about how to build a strategy.

## `getTime(format)`: Object | Date | Number

Return the current time of the simulation. `format` argument can be either:

* `index`: The method will return the number of candles since the start of the process. 0 == first candle.
* `timestamp`: The method will return the current candle timestamp.
* `date`: The method will return the Date object of the current candle.
* `undefined`: The method will return an object with all the following format.

```js
{
    index: Number,
    timestamp: Number,
    date: Date
}
```

## `addIndicatorView(name, color)`

This method can be used to add custom indicators on the web chart. To use this first you must add a custom field on the candle object using the `setHistory` method.

* `name`: The field name you added to the `candle` object using the `setHistory` method.
* `color`: A string representing the color of the indicator line to be added to the chart. If the indicator is an object with several fields, you must send an array of colors.

Example:

```js
this.SMA = new this.indicators.SMA({period: 60, values: []});
this.addIndicatorView('SMA', '#ffffff');
this.setHistory(candle => {
    candle.SMA = this.SMA.nextValue(candle.close);
    return candle;
});
```

![image](https://user-images.githubusercontent.com/19828711/199321031-f89aafe6-c511-4a1d-bd48-7709d95ffdff.png)

# Technical Indicators

Since most stretegies need indicators to do their magic, this bot comes with [technicalindicators](https://www.npmjs.com/package/technicalindicators) module pre-installed. It can be accessed with `this.indicators`:

```js
const SMA = this.indicators.SMA;
const prices = [1,2,3,4,5,6,7,8,9,10,12,13,15];
const period = 10;
SMA({ period: period, values: prices });
```
Go to the [module's documentation](https://www.npmjs.com/package/technicalindicators) to learn how to use each indicator.

# Other modules
You can also install any other node modules that you think it might help you improving your strategy (e.g. [node-fetch](https://www.npmjs.com/package/node-fetch)):

```
npm i node-fetch
```

Then you can use normally on your strategy:

```js
const fetch = require('node-fetch');

...
const req = await fetch('example.com/api-endpoint');
const data = await req.json();
...
```

# Receiving alerts

The bot can send you alerts whenever it performs a swap. If you are willing to receive those alerts, you should set the `telegram.enabled` field to `true`.

You also need to have a Telegram bot. If you don't have one, just go to their [reference page](https://core.telegram.org/bots) and learn how to create one.

After that, you need to fill `telegram.token` and `telegram.chainId` fields in the config file.

Done! From now on you will receive a Telegram message whenever your strategy perform a swap.

# Contributions

If you like this bot, and think you can contribute with its code, just create a pull request. I would love to integrate other dexes and exchanges on it. It would be very nice to include several community created sample strategies also.

I also accept donations from any EVM compatible network (Ethereum, Polygon, BNB chain, Avalanche, Fantom, Arbitrum, Optimism, and so on).

### **WALLET: `0x7F5D7E00d82DfEB7e83A0d4285CB21b31FEAB2B4`**

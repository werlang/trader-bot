const fs = require('fs');

const args = {};

let running = true;

// receive args
process.argv.forEach((val, index, array) => {
    if ((val == '-s' || val == '--scan') && array[index+1]){
        args.scanFile = array[index+1];
    }
    if ((val == '-t' || val == '--trader') && array[index+1]){
        args.traderFile = array[index+1];
    }
    if ((val == '-w' || val == '--web')){
        args.webServer = true;
    }
});

if (args.scanFile) {
    const scanConfig = JSON.parse(fs.readFileSync(`${__dirname}/${ args.scanFile }`));
    const scanner = require('./modules/scanner')(scanConfig);
    console.log('Scanner module loaded');
    scanner.scan().then(() => running = false);
}
else if (args.traderFile) {
    const traderConfig = JSON.parse(fs.readFileSync(`${__dirname}/${ args.traderFile }`));
    const wsData = {};
    const trader = require('./modules/trader')(traderConfig, wsData);
    trader.trade().then(() => {
        running = false;
        if (args.webServer) {
            require('./webserver')(wsData);
        }
    });
    console.log('Trader module loaded');
}

// keep the node app running
const run = function() {
    setTimeout(() =>  {
        if (running) {
            run();
        }
        else if (!args.webServer){
            console.log('Bye!');
            process.exit(0);
        }
    }, 100);
}
run();

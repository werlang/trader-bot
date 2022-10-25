const scanner = require('./modules/scanner');
const webServer = require('./webserver');
const trader = require('./modules/trader');

const args = {
    mode: 'live',
};
const wsData = {};

let running = true;

// receive args
process.argv.forEach((val, index, array) => {
    if ((val == '-s' || val == '--scan')){
        args.mode = 'scanner';
    }
    if ((val == '-w' || val == '--web')){
        args.webServer = true;
    }
    if ((val == '-b' || val == '--backtest')){
        args.mode = 'backtest';
    }
    if ((val == '-p' || val == '--paper')){
        args.mode = 'paper';
    }
});

if (args.mode == 'scanner') {
    scanner().scan().then(() => running = false);
}
else {
    trader({
        webServerData: wsData,
        mode: args.mode || 'live',
    })
    .then(res => {
        running = false;
        if (!res) return;

        if (args.webServer) {
            running = true;
        }
    });
}

if (args.webServer) {
    webServer(wsData);
}

// keep the node app running
const run = function() {
    setTimeout(() =>  {
        if (running) {
            run();
        }
        else {
            console.log('Bye!');
            process.exit(0);
        }
    }, 100);
}
run();

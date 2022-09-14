const args = {};

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
        args.trader = true;
    }
    if ((val == '-p' || val == '--paper')){
        args.mode = 'paper';
        args.trader = true;
    }
});

if (args.mode == 'scanner') {
    require('./modules/scanner')().scan().then(() => running = false);
}
else if (args.trader) {
    const wsData = {};

    if (args.webServer) {
        require('./webserver')(wsData);
    }

    require('./modules/trader')({
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

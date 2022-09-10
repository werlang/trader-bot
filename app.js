const config = require('./helper/config');

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
    if ((val == '-b' || val == '--backtest')){
        args.mode = 'backtest';
    }
    if ((val == '-p' || val == '--paper')){
        args.mode = 'paper';
    }
});

if (args.scanFile) {
    config(args.scanFile);
    require('./modules/scanner')().scan().then(() => running = false);
}
else if (args.traderFile) {
    config(args.traderFile);
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

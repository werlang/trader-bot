const fs = require('fs');

const args = {};

let running = true;

// receive args
process.argv.forEach((val, index, array) => {
    if ((val == '-s' || val == '--scan') && array[index+1]){
        args.scanFile = array[index+1];
    }
});

if (args.scanFile) {
    const scanConfig = JSON.parse(fs.readFileSync(`${__dirname}/${args.scanFile}`));
    const scanner = require('./scanner')(scanConfig);
    console.log('Scanner module loaded');
    scanner.scan().then(() => running = false);
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

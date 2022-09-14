const Web3 = require('web3');
const config = require('../config.json');
const contractABI = require('../asset/ERC20ABI.json');

// Network ID. (Mainnet - 1, Ropsten - 3, Polygon - 137, BSC - 56, Avalanche - 43114)
const networks = {
    ethereum: {
        id: 1,
        rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        api: 'https://api.etherscan.io',
    },
    ropsten: {
        id: 3,
        rpc: "https://ropsten.infura.io/v3",
        api: 'https://api-ropsten.etherscan.io/',
    },
    polygon: {
        id: 137,
        rpc: "https://rpc.ankr.com/polygon",
        api: 'https://api.polygonscan.com',
    },
    bsc: {
        id: 56,
        rpc: "https://bsc-dataseed.binance.org",
        api: 'https://api.bscscan.com',
    },
    avalanche: {
        id: 43114,
        rpc: "https://api.avax.network/ext/bc/C/rpc",
        api: 'https://api.snowtrace.io',
    },
}

const web3 = {
    abi: {},
    ethAddr: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',

    init: function(network) {
        this.network = Object.values(networks).find(e => e.id == network);
        if (!this.network) return false;
        this.web3 = new Web3( this.network.rpc );
    },

    getETHBalance: async function(wallet) {
        const balance = await this.web3.eth.getBalance(wallet);
        if (!balance) {
            return false;
        }
        return balance;
    },

    getTokenBalance: async function(wallet, token) {
        if (token == this.ethAddr) {
            return this.getETHBalance(wallet);
        }

        const senderAddress = config.dex.wallet;
        const tokenContract = new this.web3.eth.Contract(contractABI, token);

        const [err, res] = await new Promise(resolve => tokenContract.methods.balanceOf(senderAddress).call((err, res) => resolve([err, res])));
        return err ? err : res;
        ;
    },

    toEth: function(value, decimals) {
        return parseInt(value) / Math.pow(10, decimals);
    },

    fromEth: function(value, decimals) {
        return parseInt(value) * Math.pow(10, decimals);
    },

    getNetworkId: function() {
        return networks[config.dex.network].id;
    },

    // will get deleted after implementation done
    foo: async function() {
        // This sample code send 1 BUSD from your address to Owlracle's address on the BNB chain.
        const Web3 = require('web3');
        const web3 = new Web3('https://bsc-dataseed.binance.org'); // this is a BNB Chain RPC. You can use any other.

        const ERC20TransferABI = 'CONTRACT_ABI_HERE';

        const BUSD_ADDRESS = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
        const busdToken = new web3.eth.Contract(ERC20TransferABI, BUSD_ADDRESS);

        const privateKey = 'YOUR_ADDRESS_PRIVATE_KEY';
        web3.eth.accounts.wallet.add(privateKey);
        const senderAddress = "YOUR_ADDRESS";

        const receiverAddress = "0xA6E126a5bA7aE209A92b16fcf464E502f27fb658"; // Owlracle address

        // get token balance
        busdToken.methods.balanceOf(senderAddress).call(function (err, res) {
            if (err) {
                console.log("An error occured", err);
                return;
            }
            console.log("The balance is: ", res);
        });

        // send 1 BUSD from your address to Owlracle
        busdToken.methods.transfer(receiverAddress, web3.utils.toWei('1', 'ether')).send({
            from: senderAddress,
            gasPrice: web3.utils.toWei(OWLRACLE_DATA, 'gwei'), // here you insert owlracle gas price
            gas: web3.utils.toHex('320000'), // gas limit
        }, function (err, res) {
            if (err) {
                console.log("An error occured", err);
                return;
            }
            console.log("Hash of the transaction: " + res)
        });
    }
}

module.exports = web3
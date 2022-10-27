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
        this.web3.eth.accounts.wallet.add(config.dex.private);
    },

    send: async function(obj) {
        return this.web3.eth.sendTransaction(obj);
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
}

module.exports = web3
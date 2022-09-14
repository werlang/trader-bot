const fetch = require('node-fetch');
const config = require('../config.json');
const web3 = require('../helper/web3');

const dex = {
    url: 'https://apiv5.paraswap.io',

    init: async function() {
        await this.getTokens();
        web3.init(this.network);
    },

    swap: async function(amount, currency=true) {
        
        if (!this.currency || !this.asset) {
            await this.init();
        }

        return web3.getTokenBalance(config.dex.wallet, this.asset.address);

        const obj = {
            side: 'SELL',
            network: this.network,
        };
        if (currency) {
            obj.srcToken = this.currency.address;
            obj.destToken = this.asset.address;
            obj.amount = amount * Math.pow(10, this.currency.decimals);
        }
        else {
            obj.srcToken = this.asset.address;
            obj.destToken = this.currency.address;
            obj.amount = amount * Math.pow(10, this.asset.decimals);
        }

        return await this.getTx(obj);
    },
    
    getTokens: async function() {
        const endpoint = 'tokens';
        const req = await fetch(`${ this.url }/${ endpoint }/${ this.network }`);
        const data = await req.json();
        this.asset = data.tokens.find(token => token.symbol == config.dex.asset);
        this.currency = data.tokens.find(token => token.symbol == config.dex.currency);
        
        if (!this.asset || !this.currency) return false;
        return true;
    },

    getPrice: async function(obj) {
        const endpoint = 'prices';
        const query = new URLSearchParams(obj).toString();
        const req = await fetch(`${ this.url }/${ endpoint }?${ query }`);
        const data = await req.json();
        if (!data.priceRoute) {
            console.log(data);
            return false;
        }
        return data.priceRoute;
    },

    getTx: async function(obj) {
        const priceRoute = await this.getPrice(obj);
        if (!priceRoute) return false;
        // console.log(priceRoute);
        
        const endpoint = 'transactions';
        const query = new URLSearchParams({
            srcToken: priceRoute.srcToken,
            destToken: priceRoute.destToken,
            userAddress: config.dex.wallet,
            srcAmount: priceRoute.srcAmount,
            destAmount: priceRoute.destAmount,
        }).toString();
        const req = await fetch(`${ this.url }/${ endpoint }/${ this.network }?${ query }`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceRoute: priceRoute }),
        });
        const data = await req.json();
        if (data.error) {
            console.log(data);
            return false;
        }
        return data;
    },
}

module.exports = (network) => {
    // Network ID. (Mainnet - 1, Ropsten - 3, Polygon - 137, BSC - 56, Avalanche - 43114)
    dex.network = network;
    return dex;
};
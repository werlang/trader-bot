const fetch = require('node-fetch');
const config = require('../helper/config');

const dex = {
    url: 'https://apiv5.paraswap.io',

    swap: async function() {
        return await this.getTx();
    },
    
    getTokens: async function() {
        const endpoint = 'tokens';
        const req = await fetch(`${ this.url }/${ endpoint }/${ this.network }`);
        const data = await req.json();
        this.asset = data.tokens.find(token => token.symbol == config().dex.asset);
        this.currency = data.tokens.find(token => token.symbol == config().dex.currency);
        
        if (!this.asset || !this.currency) return false;
        return true;
    },

    getPrice: async function() {
        const endpoint = 'prices';
        const query = new URLSearchParams({
            // srcToken: ,
            // destToken: ,
            // amount: ,
            // side: ,
            // network: this.network,
        }).toString();
        const req = await fetch(`${ this.url }/${ endpoint }?${ query }`);
        const data = await req.json();
        if (data.priceRoute) {
            return data.priceRoute;
        }
        return false;
    },

    getTx: async function() {
        const priceRoute = await this.getPrice();
        if (!priceRoute) return false;

        const endpoint = 'transactions';
        const query = new URLSearchParams({
            // srcToken: ,
            // destToken: ,
            // userAddress: ,
            // srcAmount: ,
            // destAmount: ,
        }).toString();
        const req = await fetch(`${ this.url }/${ endpoint }/${ this.network }?${ query }`, {
            method: 'POST',
            headers: { 'Content-Type': 'application-json' },
            body: JSON.stringify(priceRoute),
        });
        const data = await req.json();
        if (data.from && data.to) {
            return data;
        }
        return false;
    },
}

module.exports = (network) => {
    // Network ID. (Mainnet - 1, Ropsten - 3, Polygon - 137, BSC - 56, Avalanche - 43114)
    dex.network = network;
    return dex;
};
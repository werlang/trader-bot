const fetch = require('node-fetch');
const config = require('../config.json');
const web3 = require('../helper/web3');

const dex = {
    url: 'https://apiv5.paraswap.io',

    init: async function() {
        if (this.started) return this;

        this.network = web3.getNetworkId();
        await this.getTokens();
        web3.init(this.network);
        this.started = true;
        return this;
    },

    swap: async function(amount, currency=true) {
        console.log('Getting swap rate.');
        
        if (!this.currency || !this.asset) {
            await this.init();
        }

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

        const txObj = await this.getTx(obj);

        console.log('Executing swap...');
        return txObj.error ? this.swap(amount, currency) : web3.send(txObj);
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
        delete data.chainId;
        return data;
    },
}

module.exports = dex;
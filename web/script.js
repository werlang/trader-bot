const data = await (async () => {
    const req = await fetch('/data'); 
    return await req.json();
})();
// console.log(data);

const stepTime = (new Date(data.endingTime).getTime() - new Date(data.startingTime).getTime()) / data.wallet.length;
const timeData = data.wallet.map((e,i) => parseInt((new Date(data.startingTime).getTime() + parseInt(stepTime * i)) / 1000));

const chartOptions = { layout: { textColor: 'black', background: { type: 'solid', color: 'white' } } };
const chart = LightweightCharts.createChart(document.body, {
    layout: {
        backgroundColor: '#252B36',
        textColor: '#a4a5aa',
    },
    grid: {
        vertLines: {
            color: '#353e4c',
        },
        horzLines: {
            color: '#353e4c',
        },
    },
    timeScale: {
        timeVisible: true,
        secondsVisible: false,
    },
    // rightPriceScale: {
    //     visible: true,
    // },
    // leftPriceScale: {
    //     visible: true,
    // },
});

const marketSeries = chart.addAreaSeries({ lineColor: '#3257bd', topColor: '#3257bd70', bottomColor: '#3257bd20' });
marketSeries.priceScale().applyOptions({ mode: 3 });
marketSeries.setData( timeData.map((e,i) => ({
    value: data.market[i],
    time: e,
})) );

const getBalance = i => {
    return data.wallet[i].currency + data.wallet[i].asset * data.market[i];
}

const getColorRatio = i => {
    // green: rgb(38, 166, 154)
    // red: rgb(239, 83, 80)
    // r: %201 + 38
    // g: %83 + 83
    // b: %74 + 80

    const ratio = data.wallet[i].currency / getBalance(i);
    const r = (255 - (parseInt(ratio * 201) + 38)).toString(16).padStart(2, '0');
    const g = (parseInt(ratio * 83) + 83).toString(16).padStart(2, '0');
    const b = (parseInt(ratio * 74) + 80).toString(16).padStart(2, '0');
    return `#${ r }${ g }${ b }`;
}

const walletSeries = chart.addLineSeries();
walletSeries.priceScale().applyOptions({ mode: 3 });
walletSeries.setData( timeData.map((e,i) => ({
    value: getBalance(i),
    time: e,
    color: getColorRatio(i),
})) );


const markers = data.swaps.map(e => ({
    time: parseInt(new Date(e.time).getTime() / 1000),
    position: 'inBar',
    color: e.currency ? 'rgb(38, 166, 154)' : 'rgb(239, 83, 80)',
    shape: 'circle',
    text: `${ getRightPrecision(e.amount) } @ ${ getRightPrecision(e.price) }`,
}));
walletSeries.setMarkers(markers);


window.addEventListener('resize', () => {
    chart.applyOptions({ height: window.innerHeight, width: window.innerWidth });
});

function getRightPrecision(amount) {
    const [integer, decimals] = amount.toString().split('.');
    let precision = 8;

    if (parseInt(integer) >= 100) {
        precision = 2;
    }
    else if (parseInt(integer) > 0) {
        precision = 4;
    }
    else {
        precision = decimals ? decimals.split('0').filter(e => e == '').length + 4 : 2;
    }
    return parseFloat(`${ integer }.${ decimals }`).toFixed(precision);
}

const legend = document.createElement('div');
legend.id = 'legend';
legend.classList.add('hidden');
document.body.insertAdjacentElement('beforeend', legend);

chart.subscribeCrosshairMove(param => {
	if (!param.time) {
        return;
	}

    const walletPrice = param.seriesPrices.get(walletSeries);
    const marketPrice = param.seriesPrices.get(marketSeries);
    legend.classList.remove('hidden');

    const marketValue = (marketPrice / data.market[0] - 1) * 100;
    const walletValue = (walletPrice / getBalance(0) - 1) * 100;

    const walletData = timeData.map((e,i) => ({
        time: e,
        currency: data.wallet[i].currency,
        asset: data.wallet[i].asset,
    })).find(e => e.time == param.time);
    
    legend.innerHTML = `
        <div>
            <span class="text">Time:</span>
            <span>${ new Date(param.time * 1000).toUTCString() }</span>
        </div>
        <div class="${ (n => n > 0 ? '' : 'negative')(marketValue) }">
            <span class="text">Market Price:</span>
            <span class="value">$${ getRightPrecision(marketPrice) }</span>
            <span class="change">(${ (n => n > 0 ? '+' + n.toFixed(1) : n.toFixed(1))(marketValue) }%)</span>
        </div>
        <div class="${ (n => n > 0 ? '' : 'negative')(walletValue) }">
            <span class="text">Wallet Balance:</span>
            <span class="value">$${ getRightPrecision(walletPrice) }</span>
            <span class="change">(${ (n => n > 0 ? '+' + n.toFixed(1) : n.toFixed(1))(walletValue) }%)</span>
        </div>
        <div>
            <span class="text">Currency in Wallet:</span>
            <span>$${ getRightPrecision(walletData.currency) }</span>
        </div>
        <div>
            <span class="text">Asset in Wallet:</span>
            <span>$${ getRightPrecision(walletData.asset) }</span>
        </div>
    `
});
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
    const r = (255 - (parseInt(ratio * 201) + 38)).toString(16).padStart(2, '0');;
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

window.addEventListener('resize', () => {
    chart.applyOptions({ height: window.innerHeight, width: window.innerWidth });
});
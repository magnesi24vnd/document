/**
 * VNKR-CHARTS.JS — Live Price Charts & Trading Data Visualization
 * Cung cấp biểu đồ giá realtime cho Exchange, Market và Home pages
 * 
 * Chức năng:
 *   - TradingView widget (Exchange page)
 *   - Candlestick / Line charts
 *   - Orderbook depth chart
 *   - Portfolio pie chart
 *   - Sparklines cho Market table
 *   - Live price ticker
 * 
 * Sử dụng Highcharts (đã có) + TradingView lite widget
 */

"use strict";

(function (window) {

  // ─── Mock OHLCV Data Generator ────────────────────────────────────────
  function generateOHLCV(basePrice, count, interval) {
    var data = [];
    var now = Date.now();
    var price = basePrice;
    interval = interval || 3600000; // 1 hour default

    for (var i = count; i >= 0; i--) {
      var open = price;
      var change = (Math.random() - 0.48) * price * 0.02;
      var close = open + change;
      var high = Math.max(open, close) + Math.random() * price * 0.01;
      var low = Math.min(open, close) - Math.random() * price * 0.01;
      var volume = Math.floor(Math.random() * 5000000) + 500000;

      data.push([now - i * interval, open, high, low, close, volume]);
      price = close;
    }
    return data;
  }

  // ─── Sparkline Generator ─────────────────────────────────────────────
  function generateSparkline(basePrice, count) {
    var data = [];
    var price = basePrice;
    for (var i = 0; i < count; i++) {
      price += (Math.random() - 0.48) * price * 0.01;
      data.push(Math.round(price * 10000) / 10000);
    }
    return data;
  }

  // ─── Color by trend ───────────────────────────────────────────────────
  function trendColor(data) {
    if (data.length < 2) return '#58BD7D';
    return data[data.length - 1] >= data[0] ? '#58BD7D' : '#FF6838';
  }

  window.VNKR_CHARTS = {

    // ─── Exchange Page: Full TradingView Widget ─────────────────────────
    initExchange: function () {
      var container = document.getElementById('vnkr-tradingview') ||
        document.querySelector('.exchange__chart');

      if (!container) return;

      container.id = 'vnkr-tradingview';

      // TradingView widget (nếu có script)
      if (window.TradingView) {
        new window.TradingView.widget({
          container_id: 'vnkr-tradingview',
          symbol: 'BINANCE:BNBUSDT',
          interval: '60',
          theme: document.body.classList.contains('dark') ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          height: 500,
          width: '100%'
        });
      } else {
        // Fallback: Highcharts OHLCV
        this.renderCandlestick(container, 'VNKR/USDT', 0.0842);
      }

      // Init orderbook
      this.initOrderbook();

      // Start price ticker
      this.startPriceTicker();
    },

    // ─── Highcharts Candlestick ──────────────────────────────────────────
    renderCandlestick: function (container, symbol, basePrice) {
      if (!window.Highcharts) return;

      var data = generateOHLCV(basePrice, 168, 3600000); // 7 days hourly

      Highcharts.stockChart(container, {
        chart: {
          backgroundColor: document.body.classList.contains('dark') ? '#141416' : '#FCFCFD',
          style: { fontFamily: 'Poppins, sans-serif' }
        },
        title: { text: symbol + ' Price Chart', style: { color: '#FCFCFD', fontSize: '14px' } },
        xAxis: { type: 'datetime', lineColor: '#353945' },
        yAxis: {
          gridLineColor: '#23262F',
          labels: { style: { color: '#777e91' } },
          title: { text: 'Price (USDT)', style: { color: '#777e91' } }
        },
        series: [{
          type: 'candlestick',
          name: symbol,
          data: data.map(function (d) { return [d[0], d[1], d[2], d[3], d[4]]; }),
          color: '#FF6838',
          upColor: '#58BD7D',
          lineColor: '#FF6838',
          upLineColor: '#58BD7D',
          dataGrouping: { enabled: false }
        }, {
          type: 'column',
          name: 'Volume',
          data: data.map(function (d) { return [d[0], d[5]]; }),
          yAxis: 1,
          color: 'rgba(55, 114, 255, 0.3)'
        }],
        yAxis: [
          { height: '70%', lineColor: '#353945', gridLineColor: '#23262F', labels: { style: { color: '#777e91' } } },
          { top: '72%', height: '28%', offset: 0, lineColor: '#353945', gridLineColor: '#23262F', labels: { style: { color: '#777e91' } } }
        ],
        tooltip: {
          backgroundColor: '#23262F',
          borderColor: '#353945',
          style: { color: '#FCFCFD' }
        },
        credits: { enabled: false },
        rangeSelector: {
          inputStyle: { color: '#777e91' },
          labelStyle: { color: '#777e91' },
          buttonTheme: {
            fill: '#23262F',
            stroke: '#353945',
            style: { color: '#FCFCFD' },
            states: { select: { fill: '#3772FF', style: { color: '#fff' } } }
          }
        },
        navigator: { enabled: true, maskFill: 'rgba(55, 114, 255, 0.1)' },
        scrollbar: { enabled: false }
      });
    },

    // ─── Orderbook Visualization ─────────────────────────────────────────
    initOrderbook: function () {
      var bidsContainer = document.querySelector('.exchange__bids, .js-bids');
      var asksContainer = document.querySelector('.exchange__asks, .js-asks');
      if (!bidsContainer && !asksContainer) return;

      if (window.VNKR_API) {
        window.VNKR_API.getOrderbook('VNKR-USDT').then(function (ob) {
          if (bidsContainer) window.VNKR_CHARTS.renderOrderbookSide(bidsContainer, ob.bids, 'buy');
          if (asksContainer) window.VNKR_CHARTS.renderOrderbookSide(asksContainer, ob.asks, 'sell');
        });
      }
    },

    renderOrderbookSide: function (container, orders, side) {
      if (!orders || !container) return;
      var total = orders.reduce(function (s, o) { return s + o[1]; }, 0);
      container.innerHTML = orders.slice(0, 12).map(function (o) {
        var pct = Math.round(o[1] / total * 100);
        var color = side === 'buy' ? 'rgba(88,189,125,' : 'rgba(255,104,56,';
        return '<div style="position:relative;padding:3px 8px;display:flex;justify-content:space-between;font-size:12px;font-family:monospace">' +
          '<div style="position:absolute;right:0;top:0;bottom:0;width:' + pct + '%;background:' + color + '0.08);z-index:0"></div>' +
          '<span style="position:relative;color:' + (side === 'buy' ? '#58BD7D' : '#FF6838') + '">' + o[0].toFixed(4) + '</span>' +
          '<span style="position:relative;color:#777e91">' + o[1].toLocaleString() + '</span>' +
          '</div>';
      }).join('');
    },

    // ─── Market Page: Table Sparklines ───────────────────────────────────
    initMarketSparklines: function () {
      document.querySelectorAll('[data-sparkline]').forEach(function (el) {
        var basePrice = parseFloat(el.dataset.price || '1');
        var data = generateSparkline(basePrice, 20);
        var color = trendColor(data);
        var w = el.offsetWidth || 100;
        var h = el.offsetHeight || 40;
        var min = Math.min.apply(null, data);
        var max = Math.max.apply(null, data);
        var range = max - min || 1;

        var points = data.map(function (v, i) {
          var x = (i / (data.length - 1)) * w;
          var y = h - ((v - min) / range) * (h - 4) - 2;
          return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');

        el.innerHTML = '<svg width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg">' +
          '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5"/>' +
          '</svg>';
      });
    },

    // ─── Home Page: VNKR Price Mini Chart ────────────────────────────────
    initHomeChart: function () {
      var container = document.querySelector('.js-vnkr-price-chart');
      if (!container || !window.Highcharts) return;

      var data = generateSparkline(0.0842, 48);
      var chartData = data.map(function (v, i) { return [Date.now() - (47 - i) * 3600000, v]; });
      var color = trendColor(data);

      Highcharts.chart(container, {
        chart: { type: 'area', height: 80, margin: [0, 0, 0, 0], backgroundColor: 'transparent' },
        title: { text: '' },
        xAxis: { visible: false },
        yAxis: { visible: false },
        legend: { enabled: false },
        tooltip: {
          formatter: function () { return '$' + this.y.toFixed(6); },
          backgroundColor: '#23262F',
          style: { color: '#FCFCFD', fontSize: '11px' }
        },
        series: [{
          data: chartData,
          color: color,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, color + '40'], [1, color + '00']]
          },
          lineWidth: 2,
          marker: { enabled: false }
        }],
        credits: { enabled: false }
      });
    },

    // ─── Live Price Ticker ───────────────────────────────────────────────
    startPriceTicker: function () {
      var tickerEl = document.querySelector('.js-price-ticker, .exchange__price');
      if (!tickerEl) return;

      var simulatePriceUpdate = function () {
        var price = window.VNKR.state.prices.VNKR;
        if (!price || !price.usd) return;

        var delta = (Math.random() - 0.5) * 0.0001;
        var newPrice = Math.max(0, price.usd + delta);
        window.VNKR.state.prices.VNKR.usd = newPrice;

        tickerEl.textContent = '$' + newPrice.toFixed(6);
        tickerEl.style.color = delta >= 0 ? '#58BD7D' : '#FF6838';
        tickerEl.style.transition = 'color 0.3s';
        setTimeout(function () { tickerEl.style.color = ''; }, 500);
      };

      setInterval(simulatePriceUpdate, 3000);
    },

    // ─── Portfolio Donut Chart ───────────────────────────────────────────
    initPortfolioChart: function (data) {
      var container = document.querySelector('.js-portfolio-chart');
      if (!container || !window.Highcharts) return;

      data = data || [
        { name: 'VNKR', y: 45, color: '#3772FF' },
        { name: 'BTC', y: 25, color: '#F7931A' },
        { name: 'ETH', y: 20, color: '#627EEA' },
        { name: 'Other', y: 10, color: '#777e91' }
      ];

      Highcharts.chart(container, {
        chart: {
          type: 'pie',
          backgroundColor: 'transparent',
          height: 200,
          margin: [0, 0, 0, 0]
        },
        title: { text: '' },
        tooltip: {
          pointFormat: '<b>{point.percentage:.1f}%</b>',
          backgroundColor: '#23262F',
          style: { color: '#FCFCFD' }
        },
        plotOptions: {
          pie: {
            innerSize: '65%',
            dataLabels: { enabled: false },
            borderWidth: 0
          }
        },
        series: [{ name: 'Portfolio', data: data }],
        credits: { enabled: false }
      });
    },

    // ─── Init all charts on page load ────────────────────────────────────
    init: function () {
      var page = window.location.pathname.split('/').pop() || '';

      if (page === 'exchange.html') this.initExchange();
      if (page === 'market.html') this.initMarketSparklines();
      if (page === 'index.html' || page === '') this.initHomeChart();
      if (page === 'wallet-overview.html') this.initPortfolioChart();
    }
  };

  // Auto init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.VNKR_CHARTS.init();
    });
  } else {
    window.VNKR_CHARTS.init();
  }

})(window);

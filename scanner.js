// ===============================
// POI SCANNER ENGINE v1
// ===============================

class POIEngine {
  constructor(candles) {
    this.candles = candles;
    this.swingHighs = [];
    this.swingLows = [];
    this.fvgs = [];
    this.orderBlocks = [];
  }

  // ===============================
  // SWING DETECTION
  // ===============================
  detectSwings() {
    for (let i = 2; i < this.candles.length - 2; i++) {
      let prev = this.candles[i - 1];
      let curr = this.candles[i];
      let next = this.candles[i + 1];

      if (curr.high > prev.high && curr.high > next.high) {
        this.swingHighs.push({ index: i, price: curr.high });
      }

      if (curr.low < prev.low && curr.low < next.low) {
        this.swingLows.push({ index: i, price: curr.low });
      }
    }
  }

  // ===============================
  // FVG DETECTION
  // ===============================
  detectFVG() {
    for (let i = 2; i < this.candles.length; i++) {
      let c1 = this.candles[i - 2];
      let c2 = this.candles[i - 1];
      let c3 = this.candles[i];

      // Bullish FVG
      if (c1.high < c3.low) {
        this.fvgs.push({
          type: "bullish",
          top: c3.low,
          bottom: c1.high,
          index: i
        });
      }

      // Bearish FVG
      if (c1.low > c3.high) {
        this.fvgs.push({
          type: "bearish",
          top: c1.low,
          bottom: c3.high,
          index: i
        });
      }
    }
  }

  // ===============================
  // ORDER BLOCK DETECTION
  // ===============================
  detectOrderBlocks() {
    for (let i = 1; i < this.candles.length - 1; i++) {
      let prev = this.candles[i - 1];
      let curr = this.candles[i];
      let next = this.candles[i + 1];

      // Bullish OB
      if (prev.close < prev.open && next.close > curr.high) {
        this.orderBlocks.push({
          type: "bullish",
          high: prev.high,
          low: prev.low,
          index: i - 1
        });
      }

      // Bearish OB
      if (prev.close > prev.open && next.close < curr.low) {
        this.orderBlocks.push({
          type: "bearish",
          high: prev.high,
          low: prev.low,
          index: i - 1
        });
      }
    }
  }

  // ===============================
  // GET POIs
  // ===============================
  getPOIs() {
    let pois = [];

    this.fvgs.forEach(fvg => {
      pois.push({
        type: "FVG",
        direction: fvg.type,
        zone: [fvg.bottom, fvg.top]
      });
    });

    this.orderBlocks.forEach(ob => {
      pois.push({
        type: "OB",
        direction: ob.type,
        zone: [ob.low, ob.high]
      });
    });

    return pois;
  }

  // ===============================
  // RUN ENGINE
  // ===============================
  run() {
    this.detectSwings();
    this.detectFVG();
    this.detectOrderBlocks();

    return {
      swings: {
        highs: this.swingHighs,
        lows: this.swingLows
      },
      pois: this.getPOIs()
    };
  }
}

// ===============================
// POI SCANNER ENGINE v2 (SMC FILTERED)
// ===============================

class POIEngine {
  constructor(candles) {
    this.candles = candles;

    this.swingHighs = [];
    this.swingLows = [];

    this.fvgs = [];
    this.orderBlocks = [];

    this.filteredPOIs = [];
  }

  // ===============================
  // SWINGS
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
  // FVG (WITH QUALITY FILTER)
  // ===============================
  detectFVG() {
    for (let i = 2; i < this.candles.length; i++) {
      let c1 = this.candles[i - 2];
      let c2 = this.candles[i - 1];
      let c3 = this.candles[i];

      let gapSize = Math.abs(c3.low - c1.high);

      // 🔥 FILTER 1: minimum gap size (removes weak FVGs)
      if (c1.high < c3.low && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bullish",
          top: c3.low,
          bottom: c1.high,
          size: gapSize
        });
      }

      if (c1.low > c3.high && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bearish",
          top: c1.low,
          bottom: c3.high,
          size: gapSize
        });
      }
    }
  }

  // ===============================
  // ORDER BLOCKS (FILTERED)
  // ===============================
  detectOrderBlocks() {
    for (let i = 1; i < this.candles.length - 2; i++) {
      let curr = this.candles[i];
      let next = this.candles[i + 1];

      let bodySize = Math.abs(curr.close - curr.open);

      // 🔥 FILTER 1: ignore weak candles
      if (bodySize < 0.0002) continue;

      // ===============================
      // BULLISH OB
      // ===============================
      if (
        curr.close < curr.open &&
        next.close > next.open &&
        next.close > curr.high
      ) {
        this.orderBlocks.push({
          type: "bullish",
          high: curr.high,
          low: curr.low,
          strength: bodySize
        });
      }

      // ===============================
      // BEARISH OB
      // ===============================
      if (
        curr.close > curr.open &&
        next.close < next.open &&
        next.close < curr.low
      ) {
        this.orderBlocks.push({
          type: "bearish",
          high: curr.high,
          low: curr.low,
          strength: bodySize
        });
      }
    }
  }

  // ===============================
  // SMC FILTER ENGINE (MAIN LOGIC)
  // ===============================
  filterPOIs() {
    let pois = [];

    // 🔥 ONLY STRONG FVGs
    this.fvgs.forEach(fvg => {
      if (fvg.size > 0.0003) {
        pois.push({
          type: "FVG",
          direction: fvg.type,
          zone: [fvg.bottom, fvg.top],
          strength: fvg.size
        });
      }
    });

    // 🔥 ONLY STRONG OBs
    this.orderBlocks.forEach(ob => {
      if (ob.strength > 0.0002) {
        pois.push({
          type: "OB",
          direction: ob.type,
          zone: [ob.low, ob.high],
          strength: ob.strength
        });
      }
    });

    this.filteredPOIs = pois;
  }

  // ===============================
  // RUN ENGINE
  // ===============================
  run() {
    this.detectSwings();
    this.detectFVG();
    this.detectOrderBlocks();
    this.filterPOIs();

    return {
      swings: {
        highs: this.swingHighs,
        lows: this.swingLows
      },
      pois: this.filteredPOIs
    };
  }
}

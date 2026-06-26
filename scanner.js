// ===============================
// POI SCANNER ENGINE v3 (RANKED)
// ===============================

class POIEngine {
  constructor(candles) {
    this.candles = candles;

    this.swingHighs = [];
    this.swingLows = [];

    this.fvgs = [];
    this.orderBlocks = [];

    this.scoredPOIs = [];
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
  // FVG (FILTERED)
  // ===============================
  detectFVG() {
    for (let i = 2; i < this.candles.length; i++) {
      let c1 = this.candles[i - 2];
      let c2 = this.candles[i - 1];
      let c3 = this.candles[i];

      let gapSize = Math.abs(c3.low - c1.high);

      if (c1.high < c3.low && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bullish",
          top: c3.low,
          bottom: c1.high,
          strength: gapSize
        });
      }

      if (c1.low > c3.high && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bearish",
          top: c1.low,
          bottom: c3.high,
          strength: gapSize
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

      if (bodySize < 0.0002) continue;

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
  // 🧠 RANKING SYSTEM (NEW CORE)
  // ===============================
  rankPOIs() {
    let allPOIs = [];

    // Convert FVGs into POIs
    this.fvgs.forEach(fvg => {
      let score = 0;

      // strength score
      if (fvg.strength > 0.0006) score += 3;
      else if (fvg.strength > 0.0004) score += 2;
      else score += 1;

      allPOIs.push({
        type: "FVG",
        direction: fvg.type,
        zone: [fvg.bottom, fvg.top],
        score: score
      });
    });

    // Convert OBs into POIs
    this.orderBlocks.forEach(ob => {
      let score = 0;

      // stronger candles = better OB
      if (ob.strength > 0.0005) score += 3;
      else if (ob.strength > 0.0003) score += 2;
      else score += 1;

      allPOIs.push({
        type: "OB",
        direction: ob.type,
        zone: [ob.low, ob.high],
        score: score
      });
    });

    // ===============================
    // FILTER + SORT (KEY PART)
    // ===============================
    this.scoredPOIs = allPOIs
      .filter(poi => poi.score >= 2)   // remove weak setups
      .sort((a, b) => b.score - a.score); // highest first
  }

  // ===============================
  // RUN ENGINE
  // ===============================
  run() {
    this.detectSwings();
    this.detectFVG();
    this.detectOrderBlocks();
    this.rankPOIs();

    return {
      swings: {
        highs: this.swingHighs,
        lows: this.swingLows
      },
      pois: this.scoredPOIs
    };
  }
}

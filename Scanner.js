// ===============================
// POI SCANNER ENGINE v4 (EXECUTION FILTER)
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
        this.swingHighs.push(curr.high);
      }

      if (curr.low < prev.low && curr.low < next.low) {
        this.swingLows.push(curr.low);
      }
    }
  }

  // ===============================
  // FVG
  // ===============================
  detectFVG() {
    for (let i = 2; i < this.candles.length; i++) {
      let c1 = this.candles[i - 2];
      let c3 = this.candles[i];

      let gapSize = Math.abs(c3.low - c1.high);

      if (c1.high < c3.low && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bullish",
          zone: [c1.high, c3.low],
          strength: gapSize,
          index: i
        });
      }

      if (c1.low > c3.high && gapSize > 0.0003) {
        this.fvgs.push({
          type: "bearish",
          zone: [c3.high, c1.low],
          strength: gapSize,
          index: i
        });
      }
    }
  }

  // ===============================
  // ORDER BLOCKS
  // ===============================
  detectOrderBlocks() {
    for (let i = 1; i < this.candles.length - 2; i++) {
      let curr = this.candles[i];
      let next = this.candles[i + 1];

      let body = Math.abs(curr.close - curr.open);

      if (body < 0.0002) continue;

      if (
        curr.close < curr.open &&
        next.close > next.open &&
        next.close > curr.high
      ) {
        this.orderBlocks.push({
          type: "bullish",
          zone: [curr.low, curr.high],
          strength: body
        });
      }

      if (
        curr.close > curr.open &&
        next.close < next.open &&
        next.close < curr.low
      ) {
        this.orderBlocks.push({
          type: "bearish",
          zone: [curr.low, curr.high],
          strength: body
        });
      }
    }
  }

  // ===============================
  // EXECUTION FILTER ENGINE
  // ===============================
  executionFilter() {
    let currentPrice = this.candles[this.candles.length - 1].close;

    let allPOIs = [...this.fvgs, ...this.orderBlocks];

    let filtered = [];

    for (let poi of allPOIs) {
      let [low, high] = poi.zone;

      // ===============================
      // FILTER 1: PROXIMITY (must be near price)
      // ===============================
      let distance = Math.abs(currentPrice - ((low + high) / 2));
      if (distance > currentPrice * 0.01) continue; // 1% max distance

      // ===============================
      // FILTER 2: DIRECTION ALIGNMENT
      // ===============================
      let isBull = poi.type === "bullish";
      let marketBullish = this.swingLows.length > this.swingHighs.length;

      if (marketBullish && !isBull) continue;
      if (!marketBullish && isBull) continue;

      // ===============================
      // FILTER 3: SCORING
      // ===============================
      let score = 0;

      if (poi.strength > 0.0006) score += 3;
      else if (poi.strength > 0.0003) score += 2;
      else score += 1;

      if (distance < currentPrice * 0.005) score += 2;

      // ===============================
      // FINAL VALIDATION
      // ===============================
      if (score >= 4) {
        filtered.push({
          type: poi.type.toUpperCase(),
          zone: poi.zone,
          score: score
        });
      }
    }

    // ===============================
    // REMOVE DUPLICATES (ZONE MERGE)
    // ===============================
    this.scoredPOIs = this.mergeZones(filtered);
  }

  // ===============================
  // MERGE OVERLAPPING ZONES
  // ===============================
  mergeZones(pois) {
    let merged = [];

    for (let poi of pois) {
      let found = false;

      for (let m of merged) {
        let overlap =
          poi.zone[0] <= m.zone[1] &&
          poi.zone[1] >= m.zone[0];

        if (overlap) {
          found = true;
          if (poi.score > m.score) {
            m.zone = poi.zone;
            m.score = poi.score;
          }
        }
      }

      if (!found) merged.push(poi);
    }

    return merged;
  }

  // ===============================
  // RUN ENGINE
  // ===============================
  run() {
    this.detectSwings();
    this.detectFVG();
    this.detectOrderBlocks();
    this.executionFilter();

    return {
      swings: {
        highs: this.swingHighs,
        lows: this.swingLows
      },
      pois: this.scoredPOIs
    };
  }
}

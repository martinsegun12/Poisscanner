// ===============================
// POI ENGINE v5 (MULTI-TF ALIGNMENT)
// ===============================

class POIEngine {
  constructor(data) {
    // data must contain multiple TF candles
    // {
    //   D1: [...],
    //   H4: [...],
    //   H1: [...],
    //   M15: [...]
    // }

    this.data = data;

    this.htfPOIs = [];   // 1D + 4H
    this.ltfPOIs = [];   // 1H + 15M

    this.alignedPOIs = [];
  }

  // ===============================
  // BASIC SWING LOGIC (REUSED)
  // ===============================
  getTrend(candles) {
    let highs = [];
    let lows = [];

    for (let i = 2; i < candles.length - 2; i++) {
      let c = candles[i];
      let p = candles[i - 1];
      let n = candles[i + 1];

      if (c.high > p.high && c.high > n.high) highs.push(c.high);
      if (c.low < p.low && c.low < n.low) lows.push(c.low);
    }

    let lastHighs = highs.slice(-3);
    let lastLows = lows.slice(-3);

    if (lastHighs.length < 2 || lastLows.length < 2) return "range";

    let bullish =
      lastHighs[lastHighs.length - 1] > lastHighs[0] &&
      lastLows[lastLows.length - 1] > lastLows[0];

    let bearish =
      lastHighs[lastHighs.length - 1] < lastHighs[0] &&
      lastLows[lastLows.length - 1] < lastLows[0];

    if (bullish) return "bullish";
    if (bearish) return "bearish";
    return "range";
  }

  // ===============================
  // SIMPLE POI DETECTION (OB + FVG COMBINED)
  // ===============================
  detectPOIs(candles, tf) {
    let pois = [];

    for (let i = 2; i < candles.length; i++) {
      let c1 = candles[i - 2];
      let c3 = candles[i];

      let gap = Math.abs(c3.low - c1.high);

      // FVG
      if (c1.high < c3.low && gap > 0.0003) {
        pois.push({
          tf,
          type: "FVG",
          direction: "bullish",
          zone: [c1.high, c3.low],
          strength: gap
        });
      }

      if (c1.low > c3.high && gap > 0.0003) {
        pois.push({
          tf,
          type: "FVG",
          direction: "bearish",
          zone: [c3.high, c1.low],
          strength: gap
        });
      }

      // OB (simple version)
      let body = Math.abs(c3.close - c3.open);

      if (body > 0.0002) {
        pois.push({
          tf,
          type: "OB",
          direction: c3.close > c3.open ? "bullish" : "bearish",
          zone: [c3.low, c3.high],
          strength: body
        });
      }
    }

    return pois;
  }

  // ===============================
  // CHECK IF LTF IS INSIDE HTF ZONE
  // ===============================
  isInside(htfZone, ltfZone) {
    return (
      ltfZone[0] >= htfZone[0] &&
      ltfZone[1] <= htfZone[1]
    );
  }

  // ===============================
  // MAIN ALIGNMENT ENGINE
  // ===============================
  align() {
    // 1D bias
    let d1Trend = this.getTrend(this.data.D1);

    // 4H POIs
    let h4POIs = this.detectPOIs(this.data.H4, "H4").filter(p =>
      d1Trend === "bullish" ? p.direction === "bullish"
      : d1Trend === "bearish" ? p.direction === "bearish"
      : false
    );

    // 1H POIs
    let h1POIs = this.detectPOIs(this.data.H1, "H1");

    // 15M POIs
    let m15POIs = this.detectPOIs(this.data.M15, "M15");

    // ===============================
    // NESTING LOGIC
    // ===============================
    let final = [];

    for (let h4 of h4POIs) {
      for (let h1 of h1POIs) {
        if (!this.isInside(h4.zone, h1.zone)) continue;

        for (let m15 of m15POIs) {
          if (!this.isInside(h4.zone, m15.zone)) continue;

          final.push({
            bias: d1Trend,
            h4POI: h4,
            h1POI: h1,
            m15POI: m15,
            score:
              h4.strength + h1.strength + m15.strength
          });
        }
      }
    }

    // ===============================
    // FINAL FILTER (ONLY BEST SETUPS)
    // ===============================
    this.alignedPOIs = final
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // max 3 setups

    return {
      bias: d1Trend,
      setups: this.alignedPOIs
    };
  }
}

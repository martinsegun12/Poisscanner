class POIEngine {
  constructor(data) {
    this.data = data;

    this.htfPOIs = [];
    this.ltfPOIs = [];
    this.alignedPOIs = [];
  }

  // ===============================
  // TREND DETECTION (STRUCTURE BASED)
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

    let h = highs.slice(-3);
    let l = lows.slice(-3);

    if (h.length < 2 || l.length < 2) return "range";

    let bullish =
      h[h.length - 1] > h[0] &&
      l[l.length - 1] > l[0];

    let bearish =
      h[h.length - 1] < h[0] &&
      l[l.length - 1] < l[0];

    if (bullish) return "bullish";
    if (bearish) return "bearish";
    return "range";
  }

  // ===============================
  // POI DETECTION (FVG + OB)
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

      // OB
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
  // CHECK IF INSIDE ZONE
  // ===============================
  isInside(outer, inner) {
    return inner[0] >= outer[0] && inner[1] <= outer[1];
  }

  // ===============================
  // MAIN ENGINE
  // ===============================
  align() {

    // 1D BIAS
    let bias = this.getTrend(this.data.D1);

    if (bias === "range") {
      return { bias: "no trend", setups: [] };
    }

    // 4H POIs (HIGH TIMEFRAME FILTER)
    let h4 = this.detectPOIs(this.data.H4, "H4")
      .filter(p => p.direction === bias);

    // 1H POIs
    let h1 = this.detectPOIs(this.data.H1, "H1");

    // 15M POIs
    let m15 = this.detectPOIs(this.data.M15, "M15");

    let setups = [];

    // ===============================
    // NESTING (REAL ALIGNMENT LOGIC)
    // ===============================
    for (let a of h4) {
      for (let b of h1) {

        if (!this.isInside(a.zone, b.zone)) continue;

        for (let c of m15) {

          if (!this.isInside(a.zone, c.zone)) continue;

          let score =
            a.strength +
            b.strength +
            c.strength;

          setups.push({
            bias,
            h4POI: a,
            h1POI: b,
            m15POI: c,
            score
          });
        }
      }
    }

    // ===============================
    // CLEAN OUTPUT (TOP 3 ONLY)
    // ===============================
    this.alignedPOIs = setups
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);

    return {
      bias,
      setups: this.alignedPOIs
    };
  }

  // ===============================
  // FIX: COMPATIBILITY WITH UI
  // ===============================
  run() {
    return this.align();
  }
}

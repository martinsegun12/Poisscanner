// ===============================
// POI ENGINE v6 (CRASH SAFE + MTF)
// ===============================

class POIEngine {
  constructor(data) {
    // SAFE DEFAULTS (prevents undefined errors)
    this.data = {
      D1: data?.D1 || [],
      H4: data?.H4 || [],
      H1: data?.H1 || [],
      M15: data?.M15 || []
    };

    this.alignedPOIs = [];
  }

  // ===============================
  // SAFE TREND DETECTION
  // ===============================
  getTrend(candles) {
    if (!candles || candles.length < 5) return "range";

    let highs = [];
    let lows = [];

    for (let i = 2; i < candles.length - 2; i++) {
      let c = candles[i];
      let p = candles[i - 1];
      let n = candles[i + 1];

      if (c.high > p.high && c.high > n.high) highs.push(c.high);
      if (c.low < p.low && c.low < n.low) lows.push(c.low);
    }

    if (highs.length < 2 || lows.length < 2) return "range";

    let bullish = highs[highs.length - 1] > highs[0] &&
                  lows[lows.length - 1] > lows[0];

    let bearish = highs[highs.length - 1] < highs[0] &&
                  lows[lows.length - 1] < lows[0];

    if (bullish) return "bullish";
    if (bearish) return "bearish";
    return "range";
  }

  // ===============================
  // SAFE POI DETECTION
  // ===============================
  detectPOIs(candles, tf) {
    if (!candles || candles.length < 3) return [];

    let pois = [];

    for (let i = 2; i < candles.length; i++) {
      let c1 = candles[i - 2];
      let c3 = candles[i];

      if (!c1 || !c3) continue;

      let gap = Math.abs((c3.low || 0) - (c1.high || 0));

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
      let body = Math.abs((c3.close || 0) - (c3.open || 0));

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
  // SAFE ZONE CHECK
  // ===============================
  isInside(outer, inner) {
    if (!outer || !inner) return false;
    return inner[0] >= outer[0] && inner[1] <= outer[1];
  }

  // ===============================
  // MAIN ENGINE (NO CRASH)
  // ===============================
  align() {

    // SAFETY CHECK
    if (!this.data.D1 || !this.data.H4 || !this.data.H1 || !this.data.M15) {
      return {
        bias: "no data",
        setups: []
      };
    }

    // 1D BIAS
    let bias = this.getTrend(this.data.D1);

    if (bias === "range") {
      return { bias, setups: [] };
    }

    // 4H FILTERED BY BIAS
    let h4 = this.detectPOIs(this.data.H4, "H4")
      .filter(p => p.direction === bias);

    // 1H
    let h1 = this.detectPOIs(this.data.H1, "H1");

    // 15M
    let m15 = this.detectPOIs(this.data.M15, "M15");

    let setups = [];

    // ===============================
    // NESTING LOGIC
    // ===============================
    for (let a of h4) {
      for (let b of h1) {

        if (!this.isInside(a.zone, b.zone)) continue;

        for (let c of m15) {

          if (!this.isInside(a.zone, c.zone)) continue;

          setups.push({
            bias,
            h4POI: a,
            h1POI: b,
            m15POI: c,
            score: (a.strength || 0) + (b.strength || 0) + (c.strength || 0)
          });
        }
      }
    }

    // TOP SETUPS ONLY
    this.alignedPOIs = setups
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      bias,
      setups: this.alignedPOIs
    };
  }

  // ===============================
  // ENTRY POINT (FIX FOR YOUR ERROR)
  // ===============================
  run() {
    return this.align();
  }
}

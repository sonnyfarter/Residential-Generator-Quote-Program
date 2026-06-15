import { describe, it, expect } from "vitest";
import { computeQuote } from "./computeQuote";
import { PRICING_DEFAULTS } from "./defaults";

describe("computeQuote — §6 acceptance check", () => {
  it("reproduces the 22kW reference quote exactly", () => {
    const r = computeQuote({
      pricing: PRICING_DEFAULTS,
      gensetMsrp: 6309, // 22kW Generac MSRP
      atsCost: 850, // 200A service-rated ATS seed cost
      // no BOM → flat material allowances (400+250+350+200 = 1200)
    });

    expect(r.cost.total).toBe(7981.75);
    expect(Math.round(r.sell.total)).toBe(10865);
    expect(Math.round(r.profit)).toBe(2884);
    expect(Math.round(r.shortfall)).toBe(616);
    expect(r.meetsTarget).toBe(false);
    expect(r.gensetCostUnverified).toBe(true);
  });

  it("uses priced BOM for materials when a takeoff exists", () => {
    const r = computeQuote({
      pricing: PRICING_DEFAULTS,
      gensetMsrp: 6309,
      atsCost: 850,
      bom: [
        {
          scope: "electrical",
          description: "x",
          qty: 1,
          unit: "ea",
          unitCost: 100,
          lineCost: 100,
          costSource: "seed",
          confidence: "high",
        },
      ],
    });
    // materials cost should be 100, not the 1200 allowance
    expect(r.cost.materials).toBe(100);
  });

  it("honors 'asis' and 'fixed' cost modes", () => {
    const asis = computeQuote({
      pricing: { ...PRICING_DEFAULTS, costMode: "asis" },
      gensetMsrp: 6309,
      atsCost: 850,
    });
    expect(asis.cost.equipment).toBe(7159); // 6309 + 850
    expect(asis.gensetCostUnverified).toBe(false);

    const fixed = computeQuote({
      pricing: { ...PRICING_DEFAULTS, costMode: "fixed", costFixed: 5000 },
      gensetMsrp: 6309,
      atsCost: 850,
    });
    expect(fixed.cost.equipment).toBe(5850); // 5000 + 850
  });
});

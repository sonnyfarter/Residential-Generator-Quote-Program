import { describe, it, expect } from "vitest";
import { sizeElectrical } from "./electrical";
import { sizeGas } from "./gas";

describe("sizeElectrical", () => {
  it("computes 240V 1φ load current and 125% continuous sizing", () => {
    const r = sizeElectrical({ kw: 22, runFt: 50 });
    // 22kW / 240V = 91.67A; ×1.25 = 114.6A
    expect(r.loadAmps).toBeCloseTo(91.7, 1);
    expect(r.sizedAmps).toBeCloseTo(114.6, 1);
    // smallest CU 75°C ≥ 114.6A is #2 (115A)
    expect(r.conductor.awg).toBe("2");
  });

  it("upsizes the conductor and holds voltage drop within target on a long run", () => {
    const short = sizeElectrical({ kw: 22, runFt: 50 });
    const long = sizeElectrical({ kw: 22, runFt: 250 });
    const order = ["6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0"];
    // a longer run requires the same or a larger conductor
    expect(order.indexOf(long.conductor.awg)).toBeGreaterThan(
      order.indexOf(short.conductor.awg)
    );
    // after upsizing, the long run is brought within (or near) the 2% target
    expect(long.vdPercent).toBeLessThanOrEqual(2.0);
    expect(short.vdPercent).toBeLessThanOrEqual(2.0);
  });

  it("flags conduit fill for verification (reduced table)", () => {
    const r = sizeElectrical({ kw: 22, runFt: 50 });
    expect(r.needsVerification).toBe(true);
    expect(r.conduitTrade).toMatch(/"/);
  });
});

describe("sizeGas", () => {
  it("emits a missing_input and returns null size when spec CFH is absent", () => {
    const r = sizeGas({
      fuel: "ng",
      genFuelCfh: null,
      runFt: 60,
      existingBtu: 150000,
    });
    expect(r.pipeSizeIn).toBeNull();
    expect(r.cfh).toBeNull();
    expect(r.missingInputs.length).toBeGreaterThan(0);
    expect(r.needsVerification).toBe(true);
  });

  it("sizes black-iron pipe from a known CFH and run length", () => {
    const r = sizeGas({ fuel: "ng", genFuelCfh: 200, runFt: 60, existingBtu: 0 });
    // at 60ft, 1" carries 257 CFH ≥ 200; 3/4" carries 136 < 200
    expect(r.pipeSizeIn).toBe(1);
  });

  it("flags meter overload when combined load exceeds capacity", () => {
    const r = sizeGas({
      fuel: "ng",
      genFuelCfh: 300, // 300 CFH × 1000 = 300,000 BTU/hr
      runFt: 40,
      existingBtu: 150000,
      meterCapacityBtu: 250000,
    });
    expect(r.meterAdequate).toBe(false);
  });

  it("reports meter capacity as missing input when unknown (NG)", () => {
    const r = sizeGas({ fuel: "ng", genFuelCfh: 200, runFt: 40, existingBtu: 100000 });
    expect(r.meterAdequate).toBeNull();
    expect(r.missingInputs.some((m) => m.includes("meter"))).toBe(true);
  });
});

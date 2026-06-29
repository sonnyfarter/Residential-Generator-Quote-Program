import { describe, it, expect } from "vitest";
import { buildDeterministicTakeoff } from "./bom";
import { SEED_PRICE_BOOK } from "@/lib/priceBook/seed";
import { GENERAC_CATALOG } from "@/lib/catalog/generac";
import type { HouseInfo } from "@/lib/types";

const house = (over: Partial<HouseInfo> = {}): HouseInfo => ({
  serviceAmps: 200,
  fuel: "ng",
  distGenPanelFt: 60,
  distGenGasFt: 60,
  distGenElecMeterFt: 40,
  existingGasBtu: 150000,
  gasSupplyInWc: 7,
  ...over,
});

describe("buildDeterministicTakeoff — priced coverage (no $0 feeder/conduit)", () => {
  for (const kw of [22, 26, 48]) {
    it(`prices the feeder conductor & conduit for ${kw} kW even on a long run`, () => {
      const model = GENERAC_CATALOG.find((g) => g.kw === kw)!;
      const det = buildDeterministicTakeoff({
        model,
        house: house({ distGenPanelFt: 300, distGenElecMeterFt: 250 }),
        items: [],
        priceBook: SEED_PRICE_BOOK,
        fuelCfhOverride: 250,
      });
      const conductor = det.bom.find((l) => /Feeder conductor/i.test(l.description));
      const conduit = det.bom.find((l) => /PVC feeder conduit/i.test(l.description));
      expect(conductor).toBeDefined();
      expect(conductor!.costSource).not.toBe("none");
      expect(conductor!.unitCost).toBeGreaterThan(0);
      expect(conduit).toBeDefined();
      expect(conduit!.costSource).not.toBe("none");
      expect(conduit!.unitCost).toBeGreaterThan(0);
    });
  }

  it("prices the gas line for a known CFH at a normal run length", () => {
    const model = GENERAC_CATALOG.find((g) => g.kw === 22)!;
    const det = buildDeterministicTakeoff({
      model, house: house({ distGenGasFt: 60 }), items: [], priceBook: SEED_PRICE_BOOK,
      fuelCfhOverride: 200,
    });
    const gas = det.bom.find((l) => /black iron gas line/i.test(l.description));
    expect(gas).toBeDefined();
    expect(gas!.unitCost).toBeGreaterThan(0);
    expect(gas!.costSource).not.toBe("none");
  });
});

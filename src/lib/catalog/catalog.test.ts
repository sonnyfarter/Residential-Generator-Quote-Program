import { describe, it, expect } from "vitest";
import { catalogToCsv, csvToCatalog } from "./csv";
import { GENERAC_CATALOG } from "./generac";

describe("catalog CSV", () => {
  it("round-trips the seed catalog", () => {
    const csv = catalogToCsv(GENERAC_CATALOG);
    const { models, errors } = csvToCatalog(csv);
    expect(errors).toEqual([]);
    expect(models.length).toBe(GENERAC_CATALOG.length);
    const k22 = models.find((m) => m.kw === 22);
    expect(k22?.msrp).toBe(6309);
  });

  it("parses fuel CFH columns and leaves blanks null", () => {
    const csv = [
      "brand,model,name,kw,msrp,cat,ats,status,fuelCfhNg,fuelCfhLp,fuelSource",
      "Generac,7042,Guardian 22kW,22,6309,air,200,current,220,3.2,SpecG123",
      "Generac,7171,Guardian 10kW,10,3209,air,100,current,,,",
    ].join("\n");
    const { models, errors } = csvToCatalog(csv);
    expect(errors).toEqual([]);
    expect(models[0].fuelCfh?.ng).toBe(220);
    expect(models[0].fuelCfh?.source).toBe("SpecG123");
    expect(models[1].fuelCfh).toBeNull();
  });

  it("reports invalid category rows", () => {
    const csv = [
      "brand,model,name,kw,msrp,cat,ats",
      "Generac,X,Bad,10,1000,diesel,100",
    ].join("\n");
    const { models, errors } = csvToCatalog(csv);
    expect(models.length).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

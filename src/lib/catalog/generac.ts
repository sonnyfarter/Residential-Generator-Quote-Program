import type { GeneratorModel } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Generac residential standby catalog.
//
// SOURCE NOTE: The reference workbook
// `reference/Generac_Residential_Generator_Pricing.xlsx` was NOT present in the
// build environment, so this catalog is a *structurally representative* Generac
// Guardian (air-cooled) + Protector (liquid-cooled) lineup. Every MSRP is marked
// `status: 'needs-verification'` and surfaced as provisional in the UI — none is
// presented as a confirmed price. The 22 kW MSRP ($6,309) is the spec's anchor
// value used by the §6 acceptance check.
//
// `fuelCfh` is null for every model on purpose: full-load fuel consumption MUST
// come from the genset spec sheet. With it null, the gas engine emits a
// `missing_input` instead of inventing a CFH figure (the non-negotiable rule).
//
// Replacing this file with data extracted from the real xlsx is a data change,
// not a code change.
// ─────────────────────────────────────────────────────────────────────────────

const m = (
  model: string,
  name: string,
  kw: number,
  msrp: number,
  cat: "air" | "liquid",
  ats: number
): GeneratorModel => ({
  brand: "Generac",
  model,
  name,
  kw,
  msrp,
  cat,
  ats,
  status: "needs-verification",
  fuelCfh: null,
});

export const GENERAC_CATALOG: GeneratorModel[] = [
  // Air-cooled (Guardian series)
  m("7171", "Guardian 10 kW", 10, 3209, "air", 100),
  m("7174", "Guardian 13 kW", 13, 3699, "air", 200),
  m("7224", "Guardian 14 kW", 14, 3899, "air", 200),
  m("7209", "Guardian 18 kW", 18, 4799, "air", 200),
  m("7210", "Guardian 20 kW", 20, 5499, "air", 200),
  m("7042", "Guardian 22 kW", 22, 6309, "air", 200),
  m("7043", "Guardian 24 kW", 24, 6999, "air", 200),
  m("7291", "Guardian 26 kW", 26, 7699, "air", 200),
  // Small liquid-cooled (Protector series)
  m("RG02515", "Protector 25 kW", 25, 9899, "liquid", 200),
  m("RG03015", "Protector 30 kW", 30, 11499, "liquid", 200),
  m("RG03224", "Protector 32 kW", 32, 12999, "liquid", 400),
  m("RG03824", "Protector 38 kW", 38, 14999, "liquid", 400),
  m("RG04854", "Protector 48 kW", 48, 17999, "liquid", 400),
];

export function findModel(model: string | undefined): GeneratorModel | undefined {
  if (!model) return undefined;
  return GENERAC_CATALOG.find((g) => g.model === model);
}

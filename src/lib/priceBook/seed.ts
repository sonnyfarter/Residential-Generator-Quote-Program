import type { PriceBookItem } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Seed price book — realistic STRUCTURE for a residential genset BOM.
// Every item is costSource: 'seed' and must be shown as an estimate, never as a
// confirmed Graybar cost. Importing a Graybar CSV (see priceBook/csv.ts) flips
// items to costSource: 'graybar' with a fresh priceDate — a data change only.
// ─────────────────────────────────────────────────────────────────────────────

const SEED_DATE = "2026-06-15";

const s = (
  id: string,
  category: PriceBookItem["category"],
  sku: string,
  description: string,
  unit: PriceBookItem["unit"],
  unitCost: number,
  spec: PriceBookItem["spec"]
): PriceBookItem => ({
  id,
  category,
  sku,
  description,
  unit,
  unitCost,
  costSource: "seed",
  priceDate: SEED_DATE,
  spec,
});

export const SEED_PRICE_BOOK: PriceBookItem[] = [
  // ── Conductors (CU THHN) ──
  s("cu-6-thhn", "conductor", "SEED-CU6", "#6 CU THHN", "ft", 1.35, { awg: "6", material: "CU", insulation: "THHN" }),
  s("cu-4-thhn", "conductor", "SEED-CU4", "#4 CU THHN", "ft", 2.05, { awg: "4", material: "CU", insulation: "THHN" }),
  s("cu-2-thhn", "conductor", "SEED-CU2", "#2 CU THHN", "ft", 3.10, { awg: "2", material: "CU", insulation: "THHN" }),
  s("cu-1-thhn", "conductor", "SEED-CU1", "#1 CU THHN", "ft", 3.95, { awg: "1", material: "CU", insulation: "THHN" }),
  s("cu-1/0-thhn", "conductor", "SEED-CU1_0", "#1/0 CU THHN", "ft", 4.85, { awg: "1/0", material: "CU", insulation: "THHN" }),
  // AL equivalents
  s("al-2-thhn", "conductor", "SEED-AL2", "#2 AL THHN", "ft", 1.15, { awg: "2", material: "AL", insulation: "THHN" }),
  s("al-1/0-thhn", "conductor", "SEED-AL1_0", "#1/0 AL THHN", "ft", 1.55, { awg: "1/0", material: "AL", insulation: "THHN" }),
  s("al-2/0-thhn", "conductor", "SEED-AL2_0", "#2/0 AL THHN", "ft", 1.85, { awg: "2/0", material: "AL", insulation: "THHN" }),

  // ── Conduit (PVC) + whip ──
  s("pvc-0.75", "conduit", "SEED-PVC075", '3/4" PVC Sch 40', "ft", 0.95, { size: 0.75, material: "PVC" }),
  s("pvc-1", "conduit", "SEED-PVC100", '1" PVC Sch 40', "ft", 1.35, { size: 1, material: "PVC" }),
  s("pvc-1.25", "conduit", "SEED-PVC125", '1-1/4" PVC Sch 40', "ft", 1.85, { size: 1.25, material: "PVC" }),
  s("lfmc-whip", "whip", "SEED-WHIP", "LFMC generator whip w/ fittings (3-4 ft)", "ea", 38.0, { type: "LFMC" }),
  s("lb-body", "fitting", "SEED-LB", "PVC LB conduit body", "ea", 12.5, { type: "LB" }),
  s("pvc-fittings", "fitting", "SEED-PVCFIT", "PVC fittings/glue allowance (per run)", "ea", 24.0, {}),

  // ── ATS ──
  // 200A service-rated ATS seed cost is $850 — anchors the §6 acceptance check.
  s("ats-100", "ats", "SEED-ATS100", "100A service-rated smart ATS", "ea", 620.0, { amps: 100, type: "service-rated" }),
  s("ats-200", "ats", "SEED-ATS200", "200A service-rated smart ATS", "ea", 850.0, { amps: 200, type: "service-rated" }),
  s("ats-400", "ats", "SEED-ATS400", "400A service-rated ATS", "ea", 2150.0, { amps: 400, type: "service-rated" }),

  // ── Grounding ──
  s("ground-rod", "grounding", "SEED-GRD", '5/8" x 8ft ground rod', "ea", 18.0, {}),
  s("acorn-clamp", "grounding", "SEED-ACORN", "Acorn ground clamp", "ea", 4.5, {}),
  s("gec-6", "grounding", "SEED-GEC6", "#6 CU bare GEC", "ft", 1.30, { awg: "6", material: "CU" }),

  // ── Breakers / power management ──
  s("breaker-2p", "breaker", "SEED-BRK", "2-pole breaker (feeder)", "ea", 42.0, {}),
  s("pmm", "misc", "SEED-PMM", "Power management / load-shed module", "ea", 165.0, { type: "load-shed" }),

  // ── Gas: black iron + fittings ──
  s("bi-0.75", "gas_pipe", "SEED-BI075", '3/4" black iron Sch 40', "ft", 2.40, { size: 0.75, material: "black-iron" }),
  s("bi-1", "gas_pipe", "SEED-BI100", '1" black iron Sch 40', "ft", 3.30, { size: 1, material: "black-iron" }),
  s("bi-1.25", "gas_pipe", "SEED-BI125", '1-1/4" black iron Sch 40', "ft", 4.55, { size: 1.25, material: "black-iron" }),
  s("bi-fittings", "gas_fitting", "SEED-BIFIT", "Black iron fittings allowance (per run)", "ea", 45.0, {}),
  s("csst-0.75", "gas_pipe", "SEED-CSST075", '3/4" CSST', "ft", 3.10, { size: 0.75, material: "CSST" }),
  s("csst-1", "gas_pipe", "SEED-CSST100", '1" CSST', "ft", 4.40, { size: 1, material: "CSST" }),
  s("sediment-trap", "gas_fitting", "SEED-SED", "Sediment / drip leg trap", "ea", 14.0, {}),
  s("gas-cock", "valve", "SEED-COCK", "Gas shutoff cock", "ea", 16.0, {}),
  s("lp-regulator", "regulator", "SEED-LPREG", "LP second-stage regulator", "ea", 48.0, { fuel: "lp" }),
  s("flex-connector", "gas_fitting", "SEED-FLEX", "Gas flex connector", "ea", 22.0, {}),
];

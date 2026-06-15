import type { PricingConfig } from "@/lib/types";

// Validated defaults from the prototype (§6). costPct is the UNVERIFIED genset
// cost basis (MSRP × 0.75) and is flagged everywhere it is used.
export const PRICING_DEFAULTS: PricingConfig = {
  costMode: "pct",
  costPct: 0.75,
  costFixed: 0,
  laborRate: 60,
  elecHours: 10,
  plumbHours: 5,
  siteHours: 0,
  allowConduit: 400,
  allowGas: 250,
  allowPad: 350,
  allowMisc: 200,
  permits: 300,
  markupEquipment: 1.35,
  markupLabor: 1.5,
  markupMaterials: 1.4,
  markupHazards: 1.4,
  markupPermitsPassthrough: true,
  profitTarget: 3500,
};

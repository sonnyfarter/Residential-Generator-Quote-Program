import type {
  PricingConfig,
  QuoteResult,
  SurveyItem,
  BomLine,
} from "@/lib/types";
import { bomMaterialsCost } from "@/lib/estimating/bom";

export interface ComputeQuoteInput {
  pricing: PricingConfig;
  /** Genset retail MSRP (cost derived from costMode). */
  gensetMsrp: number;
  /** ATS + accessories COST (already at cost, not retail). */
  atsCost: number;
  accessoriesCost?: number;
  /** Survey items (used for hazard cost). */
  items?: SurveyItem[];
  /** Priced takeoff BOM; when present, materials cost = sum of lines. */
  bom?: BomLine[];
  /** Hazard remediation cost (concrete cut/bore/trench etc.), at cost. */
  hazardsCost?: number;
}

/**
 * computeQuote — COST → per-category MARKUP → SELL. Matches the prototype math.
 * Acceptance (§6): 22kW MSRP 6309 ×0.75, 200A ATS cost 850, all defaults →
 * cost 7981.75, sell 10865, profit 2884, short 616.
 */
export function computeQuote(input: ComputeQuoteInput): QuoteResult {
  const p = input.pricing;

  const gensetCost = gensetCostBasis(p, input.gensetMsrp);
  const equipmentCost = round2(
    gensetCost + input.atsCost + (input.accessoriesCost ?? 0)
  );

  const laborHours = p.elecHours + p.plumbHours + p.siteHours;
  const laborCost = round2(laborHours * p.laborRate);

  // Materials: priced BOM when a takeoff exists, else flat allowances.
  const materialsCost =
    input.bom && input.bom.length > 0
      ? bomMaterialsCost(input.bom)
      : p.allowConduit + p.allowGas + p.allowPad + p.allowMisc;

  const permitsCost = p.permits;
  const hazardsCost = input.hazardsCost ?? 0;

  const cost = {
    equipment: equipmentCost,
    labor: laborCost,
    materials: round2(materialsCost),
    permits: permitsCost,
    hazards: round2(hazardsCost),
    total: round2(
      equipmentCost + laborCost + materialsCost + permitsCost + hazardsCost
    ),
  };

  const sell = {
    equipment: round2(equipmentCost * p.markupEquipment),
    labor: round2(laborCost * p.markupLabor),
    materials: round2(materialsCost * p.markupMaterials),
    permits: p.markupPermitsPassthrough
      ? permitsCost
      : round2(permitsCost * p.markupMaterials),
    hazards: round2(hazardsCost * p.markupHazards),
    total: 0,
  };
  sell.total = round2(
    sell.equipment + sell.labor + sell.materials + sell.permits + sell.hazards
  );

  const profit = round2(sell.total - cost.total);
  const shortfall = round2(p.profitTarget - profit);
  const marginPct = sell.total > 0 ? round2((profit / sell.total) * 100) : 0;

  return {
    cost,
    sell,
    profit,
    actualProfit: profit,
    marginPct,
    shortfall: shortfall > 0 ? shortfall : 0,
    meetsTarget: profit >= p.profitTarget,
    gensetCostUnverified: p.costMode === "pct",
  };
}

function gensetCostBasis(p: PricingConfig, msrp: number): number {
  switch (p.costMode) {
    case "asis":
      return round2(msrp);
    case "fixed":
      return round2(p.costFixed);
    case "pct":
    default:
      return round2(msrp * p.costPct);
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

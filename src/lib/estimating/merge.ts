import type {
  AiTakeoffResponse,
  BomLine,
  DeterministicTakeoff,
  PriceBookItem,
} from "@/lib/types";

// Merge AI deltas into the deterministic priced BOM. The AI may ADD or CHANGE
// quantities (trench feet, fittings, core drilling) — it never alters the
// engine's sizing/physics. Added items are priced against the price book by a
// light keyword match; if unmatched they stay visible but unpriced and flagged.
export function mergeAiIntoBom(
  deterministic: DeterministicTakeoff,
  ai: AiTakeoffResponse | null,
  priceBook: PriceBookItem[]
): BomLine[] {
  const bom = deterministic.bom.map((l) => ({ ...l }));
  if (!ai) return bom;

  for (const add of ai.added_or_changed_items) {
    const match = matchPrice(add.item, priceBook);
    const unitCost = match?.unitCost ?? 0;
    bom.push({
      scope: add.scope,
      description: `${add.item} (AI: ${add.reason})`,
      qty: add.qty,
      unit: (match?.unit as BomLine["unit"]) ?? (add.unit as BomLine["unit"]) ?? "ea",
      priceBookId: match?.id,
      unitCost,
      lineCost: Math.round(unitCost * add.qty * 100) / 100,
      costSource: match?.costSource ?? "none",
      confidence: add.confidence,
      needsVerification: !match,
      note: match ? undefined : "AI-suggested item — no price book match; price manually.",
    });
  }
  return bom;
}

export function mergedLaborHours(
  deterministic: DeterministicTakeoff,
  ai: AiTakeoffResponse | null
): { electrical: number; gas: number; site: number } {
  const base = deterministic.laborHours;
  if (!ai) return base;
  return {
    electrical: base.electrical + (ai.labor_hours_delta.electrical || 0),
    gas: base.gas + (ai.labor_hours_delta.gas || 0),
    site: base.site + (ai.labor_hours_delta.site || 0),
  };
}

function matchPrice(
  text: string,
  priceBook: PriceBookItem[]
): PriceBookItem | undefined {
  const t = text.toLowerCase();
  const keys: { re: RegExp; cat: PriceBookItem["category"] }[] = [
    { re: /trench|bore|directional/, cat: "misc" },
    { re: /lb\b|conduit body/, cat: "fitting" },
    { re: /fitting/, cat: "fitting" },
    { re: /conduit|pvc/, cat: "conduit" },
    { re: /ground/, cat: "grounding" },
    { re: /flex/, cat: "gas_fitting" },
    { re: /trap|sediment/, cat: "gas_fitting" },
  ];
  for (const k of keys) {
    if (k.re.test(t)) {
      const found = priceBook.find((p) => p.category === k.cat);
      if (found) return found;
    }
  }
  return undefined;
}

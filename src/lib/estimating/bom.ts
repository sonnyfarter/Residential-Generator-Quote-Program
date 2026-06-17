import type {
  BomLine,
  DeterministicTakeoff,
  GeneratorModel,
  HouseInfo,
  PriceBookItem,
  SurveyItem,
} from "@/lib/types";
import { sizeElectrical } from "./electrical";
import { sizeGas } from "./gas";

export interface BuildTakeoffInput {
  model: GeneratorModel;
  house: HouseInfo;
  items: SurveyItem[];
  priceBook: PriceBookItem[];
  meterCapacityBtu?: number | null;
  /** Spec-sheet full-load CFH entered by the user; overrides catalog value. */
  fuelCfhOverride?: number | null;
}

const PVC_BY_TRADE: Record<string, string> = {
  '0.75"': "pvc-0.75",
  '1"': "pvc-1",
  '1.25"': "pvc-1.25",
};

const CU_BY_AWG: Record<string, string> = {
  "6": "cu-6-thhn",
  "4": "cu-4-thhn",
  "2": "cu-2-thhn",
  "1": "cu-1-thhn",
  "1/0": "cu-1/0-thhn",
};

const GAS_BY_SIZE: Record<string, string> = {
  "0.75": "bi-0.75",
  "1": "bi-1",
  "1.25": "bi-1.25",
};

/**
 * Build the deterministic, priced baseline takeoff from sized engineering
 * results + price book. The AI refines this; it never replaces the physics.
 */
export function buildDeterministicTakeoff(
  input: BuildTakeoffInput
): DeterministicTakeoff {
  const { model, house, items, priceBook } = input;
  const find = (id: string) => priceBook.find((p) => p.id === id);
  const bom: BomLine[] = [];
  const flags: DeterministicTakeoff["flags"] = [];
  const missingInputs: string[] = [];

  const pushPriced = (
    scope: BomLine["scope"],
    item: PriceBookItem | undefined,
    qty: number,
    confidence: BomLine["confidence"],
    description?: string,
    needsVerification?: boolean
  ) => {
    if (!item) {
      bom.push({
        scope,
        description: description ?? "Unmapped item",
        qty,
        unit: "ea",
        unitCost: 0,
        lineCost: 0,
        costSource: "none",
        confidence,
        needsVerification: true,
        note: "No price book item mapped — add to price book.",
      });
      return;
    }
    bom.push({
      scope,
      description: description ?? item.description,
      qty: round1(qty),
      unit: item.unit,
      priceBookId: item.id,
      unitCost: item.unitCost,
      lineCost: round2(item.unitCost * qty),
      costSource: item.costSource,
      confidence,
      needsVerification,
    });
  };

  // ── Electrical ──
  // Feeder must reach the ATS wherever it sits (at the panel or the meter), so
  // size the run to the worst case of the two captured distances.
  const feederFt = Math.max(house.distGenPanelFt, house.distGenElecMeterFt);
  const elec = sizeElectrical({ kw: model.kw, runFt: feederFt });

  // Feeder conductors: 2 hots + neutral + EGC ≈ 4 conductors over the run.
  const conductorId = CU_BY_AWG[elec.conductor.awg];
  const conductorFt = feederFt * 4 * 1.1; // 10% waste
  pushPriced(
    "electrical",
    find(conductorId),
    conductorFt,
    "high",
    `Feeder conductor #${elec.conductor.awg} CU THHN (×4, +10% waste)`,
    elec.needsVerification
  );

  // Conduit
  const conduitId = PVC_BY_TRADE[elec.conduitTrade];
  pushPriced(
    "electrical",
    find(conduitId),
    feederFt * 1.05,
    "high",
    `${elec.conduitTrade} PVC feeder conduit`,
    true // conduit-fill table is a reduced subset
  );
  pushPriced("electrical", find("lfmc-whip"), 1, "high");
  pushPriced("electrical", find("lb-body"), 2, "med");
  pushPriced("electrical", find("pvc-fittings"), 1, "med");

  // ATS sized to service amperage
  const atsId =
    house.serviceAmps === 100 ? "ats-100" : house.serviceAmps === 400 ? "ats-400" : "ats-200";
  pushPriced("electrical", find(atsId), 1, "high", `${house.serviceAmps}A service-rated ATS`);

  // Grounding
  pushPriced("electrical", find("ground-rod"), 2, "med");
  pushPriced("electrical", find("acorn-clamp"), 2, "med");
  pushPriced("electrical", find("gec-6"), 12, "med", "#6 CU GEC to ground rods");

  // Breaker + power management
  pushPriced("electrical", find("breaker-2p"), 1, "med");

  // ── Gas ──
  const gas = sizeGas({
    fuel: house.fuel,
    genFuelCfh: input.fuelCfhOverride ?? model.fuelCfh?.[house.fuel] ?? null,
    runFt: house.distGenGasFt,
    existingBtu: house.existingGasBtu,
    meterCapacityBtu: input.meterCapacityBtu ?? null,
  });
  missingInputs.push(...gas.missingInputs);

  if (gas.pipeSizeIn != null) {
    const gasId = GAS_BY_SIZE[String(gas.pipeSizeIn)];
    pushPriced(
      "gas",
      find(gasId),
      house.distGenGasFt * 1.05,
      "high",
      `${gas.pipeSizeIn}" black iron gas line`,
      gas.needsVerification
    );
  } else {
    bom.push({
      scope: "gas",
      description: "Gas line — size pending spec-sheet fuel CFH",
      qty: house.distGenGasFt,
      unit: "ft",
      unitCost: 0,
      lineCost: 0,
      costSource: "none",
      confidence: "low",
      needsVerification: true,
      note: "Cannot size without generator full-load CFH.",
    });
  }
  pushPriced("gas", find("bi-fittings"), 1, "med");
  pushPriced("gas", find("sediment-trap"), 1, "high");
  pushPriced("gas", find("gas-cock"), 1, "high");
  pushPriced("gas", find("flex-connector"), 1, "high");
  if (house.fuel === "lp") {
    pushPriced("gas", find("lp-regulator"), 1, "high");
  }

  // ── Flags from sized results ──
  for (const n of elec.notes) flags.push({ message: n, severity: "info" });
  if (elec.vdPercent > 2)
    flags.push({
      message: `Feeder voltage drop ${elec.vdPercent}% exceeds 2% target.`,
      severity: "warn",
    });
  for (const n of gas.notes) flags.push({ message: n, severity: "warn" });
  if (gas.meterAdequate === false)
    flags.push({
      message: "NG meter may be undersized for combined load — coordinate utility upsize.",
      severity: "code",
    });

  // Clearance-to-opening hazard surfaced from survey items, if captured.
  const hazard = items.find((i) => i.type === "hazard");
  if (hazard && Number(hazard.values.clearanceFt) > 0 && Number(hazard.values.clearanceFt) < 5) {
    flags.push({
      message: `Generator clearance to opening ${hazard.values.clearanceFt} ft is under the 5 ft minimum — code problem.`,
      severity: "code",
    });
  }

  return {
    bom,
    electrical: {
      loadAmps: elec.loadAmps,
      sizedAmps: elec.sizedAmps,
      conductor: elec.conductor,
      vdPercent: elec.vdPercent,
      conduitTrade: elec.conduitTrade,
      needsVerification: elec.needsVerification,
    },
    gas: {
      cfh: gas.cfh,
      pipeMaterial: gas.pipeMaterial,
      pipeSizeIn: gas.pipeSizeIn,
      meterAdequate: gas.meterAdequate,
      needsVerification: gas.needsVerification,
    },
    flags,
    missingInputs,
    laborHours: { electrical: 0, gas: 0, site: 0 }, // base; AI proposes deltas
  };
}

export function bomMaterialsCost(bom: BomLine[]): number {
  return round2(bom.reduce((sum, l) => sum + l.lineCost, 0));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

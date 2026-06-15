import {
  CONDUCTORS,
  K_CU,
  K_AL,
  PVC_FILL_4COND,
  PVC_FILL_VERIFIED,
  type ConductorRow,
} from "./tables";

export interface ElectricalInput {
  kw: number;
  voltage?: number; // default 240, 1φ
  material?: "CU" | "AL"; // default CU
  runFt: number; // one-way feeder length
  vdTargetPct?: number; // default 2%
}

export interface ElectricalResult {
  loadAmps: number;
  sizedAmps: number; // 125% continuous
  conductor: { awg: string; material: "CU" | "AL"; ampacity: number };
  vdPercent: number;
  conduitTrade: string;
  needsVerification: boolean;
  notes: string[];
}

/**
 * Size the generator feeder.
 *  - Load current: 1φ 240V → amps = kW*1000 / V   (NEC)
 *  - Continuous: feeder sized to 125% of nameplate (standby output continuous).
 *  - Ampacity: NEC 310.16 75°C terminations → smallest conductor ≥ sized amps.
 *  - Voltage drop: Vd = 2·K·I·L / cmil (1φ). Upsize if over target.
 *  - Conduit fill: NEC Ch.9 → PVC trade size at ≤40% fill.
 */
export function sizeElectrical(input: ElectricalInput): ElectricalResult {
  const v = input.voltage ?? 240;
  const material = input.material ?? "CU";
  const vdTarget = input.vdTargetPct ?? 2;
  const notes: string[] = [];

  const loadAmps = (input.kw * 1000) / v;
  const sizedAmps = loadAmps * 1.25;

  const K = material === "CU" ? K_CU : K_AL;
  const ampacityOf = (r: ConductorRow) =>
    material === "CU" ? r.ampacityCu75 : r.ampacityAl75;

  // 1) smallest conductor whose ampacity ≥ sized current
  let idx = CONDUCTORS.findIndex((r) => ampacityOf(r) >= sizedAmps);
  if (idx === -1) {
    idx = CONDUCTORS.length - 1;
    notes.push(
      "Sized current exceeds the largest conductor in the table — verify feeder sizing manually."
    );
  }

  // 2) voltage-drop check; upsize until within target (or out of table)
  const vd = (r: ConductorRow) => (2 * K * loadAmps * input.runFt) / r.cmil;
  let vdPct = (vd(CONDUCTORS[idx]) / v) * 100;
  while (vdPct > vdTarget && idx < CONDUCTORS.length - 1) {
    idx += 1;
    vdPct = (vd(CONDUCTORS[idx]) / v) * 100;
    notes.push(`Upsized for voltage drop to #${CONDUCTORS[idx].awg}.`);
  }
  if (vdPct > vdTarget) {
    notes.push(
      `Voltage drop ${vdPct.toFixed(2)}% still exceeds ${vdTarget}% target — verify run length / conductor.`
    );
  }

  const chosen = CONDUCTORS[idx];
  const fitRow = PVC_FILL_4COND.find((f) => f.awg === chosen.awg);
  const conduitTrade = fitRow ? `${fitRow.minTradeSize4Cond}"` : `verify`;

  return {
    loadAmps: round1(loadAmps),
    sizedAmps: round1(sizedAmps),
    conductor: { awg: chosen.awg, material, ampacity: ampacityOf(chosen) },
    vdPercent: round2(vdPct),
    conduitTrade,
    // Conduit fill table is a reduced subset → always flag for verification.
    needsVerification: PVC_FILL_VERIFIED === false || !fitRow,
    notes,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

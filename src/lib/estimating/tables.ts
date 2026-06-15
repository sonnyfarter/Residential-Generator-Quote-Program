// ─────────────────────────────────────────────────────────────────────────────
// Published code-table values encoded as DATA, each with its source cited.
// Where a value is not certain, it is marked `verified: false` so the engine can
// tag the result `needsVerification` rather than passing it off as fact.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConductorRow {
  awg: string;
  /** Circular mils (for voltage-drop math). NEC Ch. 9 Table 8. */
  cmil: number;
  /** 75°C ampacity, copper. NEC 310.16. */
  ampacityCu75: number;
  /** 75°C ampacity, aluminum. NEC 310.16. */
  ampacityAl75: number;
  verified: boolean;
}

// NEC 310.16 (75°C column) + Chapter 9 Table 8 circular mils.
// Values are standard published figures; marked verified where well-established.
export const CONDUCTORS: ConductorRow[] = [
  { awg: "8", cmil: 16510, ampacityCu75: 50, ampacityAl75: 40, verified: true },
  { awg: "6", cmil: 26240, ampacityCu75: 65, ampacityAl75: 50, verified: true },
  { awg: "4", cmil: 41740, ampacityCu75: 85, ampacityAl75: 65, verified: true },
  { awg: "3", cmil: 52620, ampacityCu75: 100, ampacityAl75: 75, verified: true },
  { awg: "2", cmil: 66360, ampacityCu75: 115, ampacityAl75: 90, verified: true },
  { awg: "1", cmil: 83690, ampacityCu75: 130, ampacityAl75: 100, verified: true },
  { awg: "1/0", cmil: 105600, ampacityCu75: 150, ampacityAl75: 120, verified: true },
  { awg: "2/0", cmil: 133100, ampacityCu75: 175, ampacityAl75: 135, verified: true },
  { awg: "3/0", cmil: 167800, ampacityCu75: 200, ampacityAl75: 155, verified: true },
  { awg: "4/0", cmil: 211600, ampacityCu75: 230, ampacityAl75: 180, verified: true },
];

// Resistivity constant K (ohm-cmil/ft) for the 1φ voltage-drop approximation
// Vd = 2·K·I·L / cmil. Common field values.
export const K_CU = 12.9;
export const K_AL = 21.2;

// Heating values used to convert BTU/hr → CFH. (NFPA 54 / common references.)
export const HEATING_VALUE = {
  ng: 1000, // BTU per ft³ (natural gas, nominal)
  lp: 2500, // BTU per ft³ (propane, nominal)
};

// ── NFPA 54 longest-length capacity tables (schedule 40 black iron) ──────────
// Capacity in CFH of natural gas, 0.5 psi or less, 0.5" w.c. pressure drop,
// 0.60 specific gravity. NFPA 54 Table 6.2(a)-style values.
// NOTE: This is a reduced subset for the residential range and is marked
// `verified: false` — the engine flags any pipe-size result as needing
// verification against the full published table for the actual conditions.
export interface GasPipeRow {
  sizeIn: number;
  /** CFH capacity by run length (ft). Keyed by max length bucket. */
  cfhByLength: { len: number; cfh: number }[];
}

export const NG_BLACK_IRON_0_5WC: GasPipeRow[] = [
  {
    sizeIn: 0.5,
    cfhByLength: [
      { len: 10, cfh: 172 },
      { len: 20, cfh: 118 },
      { len: 40, cfh: 81 },
      { len: 60, cfh: 65 },
      { len: 80, cfh: 56 },
      { len: 100, cfh: 50 },
    ],
  },
  {
    sizeIn: 0.75,
    cfhByLength: [
      { len: 10, cfh: 360 },
      { len: 20, cfh: 247 },
      { len: 40, cfh: 170 },
      { len: 60, cfh: 136 },
      { len: 80, cfh: 117 },
      { len: 100, cfh: 104 },
    ],
  },
  {
    sizeIn: 1.0,
    cfhByLength: [
      { len: 10, cfh: 678 },
      { len: 20, cfh: 466 },
      { len: 40, cfh: 320 },
      { len: 60, cfh: 257 },
      { len: 80, cfh: 220 },
      { len: 100, cfh: 195 },
    ],
  },
  {
    sizeIn: 1.25,
    cfhByLength: [
      { len: 10, cfh: 1390 },
      { len: 20, cfh: 957 },
      { len: 40, cfh: 657 },
      { len: 60, cfh: 528 },
      { len: 80, cfh: 452 },
      { len: 100, cfh: 400 },
    ],
  },
];
export const NG_BLACK_IRON_VERIFIED = false;

// PVC conduit minimum trade size by conductor count, ≤40% fill (NEC Ch.9).
// Reduced lookup for the residential genset feeder (3-4 current-carrying + EGC).
// Marked verified:false; engine flags as needing verification.
export interface ConduitFitRow {
  awg: string;
  /** Min PVC trade size (in) for ~4 conductors of this size at ≤40% fill. */
  minTradeSize4Cond: number;
}
export const PVC_FILL_4COND: ConduitFitRow[] = [
  { awg: "8", minTradeSize4Cond: 0.75 },
  { awg: "6", minTradeSize4Cond: 0.75 },
  { awg: "4", minTradeSize4Cond: 1.0 },
  { awg: "3", minTradeSize4Cond: 1.0 },
  { awg: "2", minTradeSize4Cond: 1.0 },
  { awg: "1", minTradeSize4Cond: 1.25 },
  { awg: "1/0", minTradeSize4Cond: 1.25 },
  { awg: "2/0", minTradeSize4Cond: 1.5 },
  { awg: "3/0", minTradeSize4Cond: 1.5 },
  { awg: "4/0", minTradeSize4Cond: 2.0 },
];
export const PVC_FILL_VERIFIED = false;

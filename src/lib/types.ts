// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for the residential standby generator takeoff tool.
// Everything that crosses a boundary (storage, API, engine) is typed here.
// ─────────────────────────────────────────────────────────────────────────────

// ── Equipment / catalog ──────────────────────────────────────────────────────

export type GenCategory = "air" | "liquid";
export type CatalogStatus = "current" | "legacy" | "needs-verification";

export interface GeneratorModel {
  brand: "Generac"; // architected for Kohler/Cummins later as data
  model: string;
  name: string;
  kw: number;
  /** Retail MSRP in USD. Cost is derived in the pricing engine. */
  msrp: number;
  cat: GenCategory;
  /** Recommended/default ATS amperage. */
  ats: number;
  status: CatalogStatus;
  /**
   * Full-load fuel consumption from the spec sheet. NEVER invented.
   * If null, the gas engine must emit a missing_input.
   */
  fuelCfh?: {
    ng?: number; // ft³/hr at full load on natural gas
    lp?: number; // ft³/hr at full load on LP
    source?: string;
  } | null;
}

// ── Price book (the Graybar swap point) ──────────────────────────────────────

export type CostSource = "seed" | "graybar" | "manual";

export type PriceCategory =
  | "conductor"
  | "conduit"
  | "fitting"
  | "ats"
  | "breaker"
  | "grounding"
  | "gas_pipe"
  | "gas_fitting"
  | "valve"
  | "regulator"
  | "whip"
  | "misc";

export type PriceUnit = "ft" | "ea" | "box";

export interface PriceBookItem {
  id: string;
  category: PriceCategory;
  /** Graybar SKU when known; internal SKU otherwise. */
  sku: string;
  description: string;
  unit: PriceUnit;
  unitCost: number;
  /** Drives the "estimate" flag everywhere. */
  costSource: CostSource;
  /** ISO date the cost was set. */
  priceDate: string;
  spec: Record<string, string | number>;
}

// ── Survey ───────────────────────────────────────────────────────────────────

export type ItemStatus = "missing" | "partial" | "complete";

export interface Photo {
  id: string;
  /** Blob persisted in IndexedDB; survives app close. */
  blob: Blob;
  caption?: string;
  createdAt: string;
}

export interface SurveyItem {
  id: string;
  /** References a SurveyItemConfig.key */
  type: string;
  status: ItemStatus;
  values: Record<string, string | number | boolean>;
  photoIds: string[];
  /** Auto-positioned pin on the optional site diagram. */
  pin?: { x: number; y: number };
}

// ── Customer / setup ─────────────────────────────────────────────────────────

export type FuelType = "ng" | "lp";

export interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  date: string; // ISO
  rep: string;
}

export interface HouseInfo {
  serviceAmps: 100 | 200 | 400;
  fuel: FuelType;
  /** Generator → main panel, feet (feeder conductor run). */
  distGenPanelFt: number;
  /** Generator → gas meter/tank, feet (gas line run). */
  distGenGasFt: number;
  /** Generator → electric meter, feet (service tie-in). */
  distGenElecMeterFt: number;
  /** Existing connected gas appliance load, BTU/hr, for the meter check. */
  existingGasBtu: number;
  /** Supply pressure for gas sizing, inches of water column (NG ~7" wc default). */
  gasSupplyInWc: number;
}

export type ApplianceFuel = "gas" | "electric";

export interface GasAppliance {
  id: string;
  name: string;
  /** Preset key from GAS_APPLIANCE_PRESETS, or "other". */
  type: string;
  btu: number; // input BTU/hr (nameplate)
  /** Only "gas" appliances contribute to the gas meter load. */
  fuel: ApplianceFuel;
}

// ── Pricing ──────────────────────────────────────────────────────────────────

export type CostMode = "pct" | "asis" | "fixed";

export interface PricingConfig {
  costMode: CostMode;
  costPct: number; // genset cost = MSRP × costPct (flagged UNVERIFIED)
  costFixed: number; // used when costMode === 'fixed'
  laborRate: number; // $/hr burdened cost
  elecHours: number;
  plumbHours: number;
  siteHours: number;
  // Flat material allowances (fallback only, used when no priced BOM)
  allowConduit: number;
  allowGas: number;
  allowPad: number;
  allowMisc: number;
  permits: number;
  markupEquipment: number;
  markupLabor: number;
  markupMaterials: number;
  markupHazards: number;
  markupPermitsPassthrough: boolean;
  profitTarget: number;
}

// ── Estimating engine output ─────────────────────────────────────────────────

export type Confidence = "high" | "med" | "low";
export type Scope = "electrical" | "gas";

export interface BomLine {
  scope: Scope;
  description: string;
  qty: number;
  unit: PriceUnit | "lot";
  priceBookId?: string;
  unitCost: number;
  lineCost: number;
  costSource: CostSource | "none";
  confidence: Confidence;
  /** True when an underlying engineering value could not be verified. */
  needsVerification?: boolean;
  note?: string;
}

export interface EngineFinding {
  message: string;
  severity: "info" | "warn" | "code"; // 'code' = potential code violation
}

export interface DeterministicTakeoff {
  bom: BomLine[];
  electrical: {
    loadAmps: number;
    sizedAmps: number; // 125% continuous
    conductor: { awg: string; material: "CU" | "AL"; ampacity: number };
    vdPercent: number;
    conduitTrade: string;
    needsVerification: boolean;
  };
  gas: {
    cfh: number | null;
    pipeMaterial: string;
    pipeSizeIn: number | null;
    meterAdequate: boolean | null;
    needsVerification: boolean;
  };
  flags: EngineFinding[];
  missingInputs: string[];
  laborHours: { electrical: number; gas: number; site: number };
}

// ── AI refinement contract (strict JSON) ─────────────────────────────────────

export interface AiTakeoffResponse {
  job_summary: string;
  distance_adjustments: {
    path: string;
    entered_ft: number;
    estimated_ft: number;
    basis: string;
    confidence: Confidence;
  }[];
  added_or_changed_items: {
    scope: Scope;
    item: string;
    qty: number;
    unit: string;
    reason: string;
    confidence: Confidence;
  }[];
  labor_hours_delta: {
    electrical: number;
    gas: number;
    site: number;
    rationale: string;
  };
  assumptions: string[];
  flags: string[];
  missing_inputs: string[];
  disclaimer: string;
}

// ── Quote ────────────────────────────────────────────────────────────────────

export interface QuoteCostSheet {
  equipment: number;
  labor: number;
  materials: number;
  permits: number;
  hazards: number;
  total: number;
}

export interface QuoteSellSheet {
  equipment: number;
  labor: number;
  materials: number;
  permits: number;
  hazards: number;
  total: number;
}

export interface QuoteResult {
  cost: QuoteCostSheet;
  sell: QuoteSellSheet;
  profit: number;
  actualProfit: number;
  marginPct: number;
  shortfall: number;
  meetsTarget: boolean;
  /** True while genset cost basis is the unverified MSRP×pct default. */
  gensetCostUnverified: boolean;
}

// ── Site diagram ─────────────────────────────────────────────────────────────

/** Percentages 0–100 within the diagram board. */
export interface DiagramLayout {
  house: { x: number; y: number; w: number; h: number };
}

// ── Job (the unit of persistence) ────────────────────────────────────────────

export interface Job {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerInfo;
  house: HouseInfo;
  gasAppliances: GasAppliance[];
  items: SurveyItem[];
  selectedModel?: string; // GeneratorModel.model
  pricing: PricingConfig;
  ai?: AiTakeoffResponse | null;
  diagram?: DiagramLayout;
  /** Manually added takeoff lines (with cost). Persist across sessions. */
  customLines?: BomLine[];
}

// ── Company profile (Settings) ───────────────────────────────────────────────

export interface CompanyProfile {
  id: "company";
  name: string;
  phone: string;
  email: string;
  license: string;
  /** Default project-manager recipient for "send to PM". */
  pmEmail: string;
  /** Company logo, persisted as a blob; rendered on reports. */
  logo?: Blob | null;
}

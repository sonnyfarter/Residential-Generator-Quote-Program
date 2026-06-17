// ─────────────────────────────────────────────────────────────────────────────
// Declarative survey item config. Adding a field is data, not a new component.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = "text" | "number" | "select" | "toggle";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  unit?: string;
  placeholder?: string;
  /** Field is required for the item to count "complete". */
  required?: boolean;
}

export interface SurveyItemConfig {
  key: string;
  title: string;
  subtitle: string;
  /** required = a mandatory capture for every job. */
  required: boolean;
  /** can the user add more than one? */
  multiple: boolean;
  /** at least one photo is required for the item to count "complete". */
  requirePhoto?: boolean;
  /** hint shown under the photo capture (e.g. "Photo of the LRA tag"). */
  photoHint?: string;
  fields: FieldConfig[];
}

export const SURVEY_ITEMS: SurveyItemConfig[] = [
  {
    key: "generator",
    title: "Generator location",
    subtitle: "Where the unit will sit",
    required: true,
    requirePhoto: true,
    photoHint: "Photo of the proposed set location",
    multiple: false,
    fields: [
      { key: "surface", label: "Mounting surface", type: "select", required: true, options: [
        { value: "grade", label: "On grade (new pad)" },
        { value: "existing-pad", label: "Existing pad" },
        { value: "composite", label: "Composite pad" },
      ] },
      { key: "clearanceFt", label: "Clearance to nearest opening", type: "number", unit: "ft", placeholder: "e.g. 6" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "gas_meter",
    title: "Gas meter / tank",
    subtitle: "Fuel source location",
    required: true,
    requirePhoto: true,
    photoHint: "Photo of the meter / tank and regulator",
    multiple: false,
    fields: [
      { key: "fuel", label: "Fuel", type: "select", required: true, options: [
        { value: "ng", label: "Natural gas" },
        { value: "lp", label: "Propane (LP)" },
      ] },
      { key: "distanceFt", label: "Distance to generator", type: "number", unit: "ft", required: true, placeholder: "e.g. 60" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "electric_meter",
    title: "Electric meter",
    subtitle: "Service entrance",
    required: true,
    requirePhoto: true,
    photoHint: "Photo of the meter & service entrance",
    multiple: false,
    fields: [
      { key: "serviceAmps", label: "Service size", type: "select", required: true, options: [
        { value: "100", label: "100 A" },
        { value: "200", label: "200 A" },
        { value: "400", label: "400 A" },
      ] },
      { key: "distanceFt", label: "Distance to generator", type: "number", unit: "ft", required: true, placeholder: "e.g. 35" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "panel",
    title: "Main panel",
    subtitle: "Where the feeder lands",
    required: true,
    requirePhoto: true,
    photoHint: "Photo of the panel (open door + label)",
    multiple: false,
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "garage, basement…" },
      { key: "distanceFt", label: "Distance to generator", type: "number", unit: "ft", required: true, placeholder: "e.g. 45" },
      { key: "spaces", label: "Open breaker spaces", type: "number" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "hvac",
    title: "HVAC unit",
    subtitle: "Largest motor load — LRA tag required",
    required: false,
    multiple: true,
    requirePhoto: true,
    photoHint: "Required: clear photo of the LRA / data tag",
    fields: [
      { key: "tons", label: "Size", type: "number", unit: "ton" },
      { key: "lra", label: "Locked-rotor amps (from tag)", type: "number", unit: "A" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "hazard",
    title: "Site hazard",
    subtitle: "Anything that changes the work",
    required: false,
    multiple: true,
    requirePhoto: true,
    photoHint: "Photo of the obstruction / condition",
    fields: [
      { key: "kind", label: "Type", type: "select", options: [
        { value: "concrete", label: "Concrete cut / bore" },
        { value: "trench", label: "Long trench" },
        { value: "attic", label: "Attic / crawl routing" },
        { value: "clearance", label: "Clearance to opening" },
        { value: "meter-side", label: "Meter on wrong side" },
        { value: "other", label: "Other" },
      ] },
      { key: "clearanceFt", label: "Clearance (if applicable)", type: "number", unit: "ft" },
      { key: "estCost", label: "Est. remediation cost", type: "number", unit: "$" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
];

export function itemConfig(key: string): SurveyItemConfig | undefined {
  return SURVEY_ITEMS.find((i) => i.key === key);
}

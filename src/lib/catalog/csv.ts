import type { GeneratorModel, GenCategory, CatalogStatus } from "@/lib/types";

// CSV import/export for the equipment catalog — how real Generac (or Kohler /
// Cummins) data gets loaded. Columns:
//   brand, model, name, kw, msrp, cat, ats, status, fuelCfhNg, fuelCfhLp, fuelSource
// fuelCfhNg / fuelCfhLp are the spec-sheet full-load consumption (ft³/hr).
// Leave them blank if unknown — the gas engine then flags a missing input.

const COLS = [
  "brand", "model", "name", "kw", "msrp", "cat", "ats", "status",
  "fuelCfhNg", "fuelCfhLp", "fuelSource",
] as const;

const CATS: GenCategory[] = ["air", "liquid"];
const STATUSES: CatalogStatus[] = ["current", "legacy", "needs-verification"];

export function catalogToCsv(models: GeneratorModel[]): string {
  const rows = models.map((m) =>
    [
      m.brand, m.model, m.name, m.kw, m.msrp, m.cat, m.ats, m.status,
      m.fuelCfh?.ng ?? "", m.fuelCfh?.lp ?? "", m.fuelCfh?.source ?? "",
    ]
      .map((v) => csvCell(String(v)))
      .join(",")
  );
  return [COLS.join(","), ...rows].join("\n");
}

export function catalogCsvTemplate(): string {
  return [
    COLS.join(","),
    "Generac,7042,Guardian 22 kW,22,6309,air,200,current,,,",
    "Generac,RG02515,Protector 25 kW,25,9899,liquid,200,current,,,Spec sheet G0072920",
  ].join("\n");
}

export interface CatalogImportResult {
  models: GeneratorModel[];
  errors: string[];
}

export function csvToCatalog(csv: string): CatalogImportResult {
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { models: [], errors: ["CSV has no data rows."] };
  const header = parseCsvLine(lines[0]);
  const idx = (n: string) => header.indexOf(n);
  for (const c of ["model", "name", "kw", "msrp", "cat", "ats"]) {
    if (idx(c) === -1) errors.push(`Missing required column: ${c}`);
  }
  if (errors.length) return { models: [], errors };

  const models: GeneratorModel[] = [];
  for (let r = 1; r < lines.length; r++) {
    const c = parseCsvLine(lines[r]);
    const get = (n: string) => (idx(n) >= 0 ? c[idx(n)] : "");
    const kw = Number(get("kw"));
    const msrp = Number(get("msrp"));
    const ats = Number(get("ats"));
    const cat = get("cat") as GenCategory;
    if (!CATS.includes(cat)) {
      errors.push(`Row ${r + 1}: invalid cat "${cat}" (air|liquid)`);
      continue;
    }
    if (![kw, msrp, ats].every(Number.isFinite)) {
      errors.push(`Row ${r + 1}: kw/msrp/ats must be numbers`);
      continue;
    }
    const statusRaw = get("status") as CatalogStatus;
    const status = STATUSES.includes(statusRaw) ? statusRaw : "current";
    const ng = numOrNull(get("fuelCfhNg"));
    const lp = numOrNull(get("fuelCfhLp"));
    const source = get("fuelSource") || undefined;
    models.push({
      brand: (get("brand") as GeneratorModel["brand"]) || "Generac",
      model: get("model"),
      name: get("name"),
      kw,
      msrp,
      cat,
      ats,
      status,
      fuelCfh: ng == null && lp == null && !source ? null : { ng: ng ?? undefined, lp: lp ?? undefined, source },
    });
  }
  return { models, errors };
}

function numOrNull(s: string): number | null {
  if (s === "" || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

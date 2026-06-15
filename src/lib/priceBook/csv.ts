import type { PriceBookItem, PriceCategory, PriceUnit } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Price book CSV import/export — the mechanism for loading real Graybar pricing.
// Columns: category, sku, description, unit, unitCost, then spec_* columns.
// Importing sets costSource: 'graybar' and refreshes priceDate.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_COLS = ["category", "sku", "description", "unit", "unitCost"] as const;

const CATEGORIES: PriceCategory[] = [
  "conductor", "conduit", "fitting", "ats", "breaker", "grounding",
  "gas_pipe", "gas_fitting", "valve", "regulator", "whip", "misc",
];
const UNITS: PriceUnit[] = ["ft", "ea", "box"];

export function priceBookToCsv(items: PriceBookItem[]): string {
  // Collect all spec keys present across items for stable columns.
  const specKeys = Array.from(
    new Set(items.flatMap((i) => Object.keys(i.spec)))
  ).sort();
  const header = [...BASE_COLS, ...specKeys.map((k) => `spec_${k}`)];
  const rows = items.map((i) => {
    const base = [i.category, i.sku, i.description, i.unit, String(i.unitCost)];
    const specs = specKeys.map((k) =>
      i.spec[k] === undefined ? "" : String(i.spec[k])
    );
    return [...base, ...specs].map(csvCell).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

/** Empty template with the seed columns, so the user knows the format. */
export function priceBookCsvTemplate(): string {
  return [
    [...BASE_COLS, "spec_awg", "spec_material", "spec_size"].join(","),
    "conductor,GRAYBAR-SKU,#2 CU THHN,ft,3.10,2,CU,",
    "gas_pipe,GRAYBAR-SKU,1\" black iron,ft,3.30,,black-iron,1",
  ].join("\n");
}

export interface CsvImportResult {
  items: PriceBookItem[];
  errors: string[];
}

export function csvToPriceBook(
  csv: string,
  priceDate = new Date().toISOString().slice(0, 10)
): CsvImportResult {
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { items: [], errors: ["CSV has no data rows."] };
  }
  const header = parseCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  for (const c of BASE_COLS) {
    if (idx(c) === -1) errors.push(`Missing required column: ${c}`);
  }
  if (errors.length) return { items: [], errors };

  const specCols = header
    .map((h, i) => ({ h, i }))
    .filter((c) => c.h.startsWith("spec_"));

  const items: PriceBookItem[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const category = cells[idx("category")] as PriceCategory;
    const unit = cells[idx("unit")] as PriceUnit;
    const unitCost = Number(cells[idx("unitCost")]);
    const sku = cells[idx("sku")] ?? "";
    const description = cells[idx("description")] ?? "";

    if (!CATEGORIES.includes(category)) {
      errors.push(`Row ${r + 1}: invalid category "${category}"`);
      continue;
    }
    if (!UNITS.includes(unit)) {
      errors.push(`Row ${r + 1}: invalid unit "${unit}"`);
      continue;
    }
    if (!Number.isFinite(unitCost)) {
      errors.push(`Row ${r + 1}: invalid unitCost`);
      continue;
    }
    const spec: Record<string, string | number> = {};
    for (const c of specCols) {
      const raw = cells[c.i];
      if (raw === undefined || raw === "") continue;
      const key = c.h.slice("spec_".length);
      const num = Number(raw);
      spec[key] = raw !== "" && Number.isFinite(num) ? num : raw;
    }
    items.push({
      id: `gb-${sku || description}-${r}`.replace(/\s+/g, "_").toLowerCase(),
      category,
      sku,
      description,
      unit,
      unitCost,
      costSource: "graybar",
      priceDate,
      spec,
    });
  }
  return { items, errors };
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

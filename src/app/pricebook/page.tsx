"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { priceBookToCsv, priceBookCsvTemplate, csvToPriceBook } from "@/lib/priceBook/csv";
import { SEED_PRICE_BOOK } from "@/lib/priceBook/seed";
import type { PriceBookItem } from "@/lib/types";
import { Screen, Card, money2, EstimateBadge } from "@/components/ui";

export default function PriceBookPage() {
  const store = useJob((s) => s.store);
  const init = useJob((s) => s.init);
  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    store.getPriceBook().then(setItems);
  }, [store]);

  async function reload() {
    setItems(await store.getPriceBook());
  }

  function download(name: string, text: string) {
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { items: imported, errors } = csvToPriceBook(text);
    if (errors.length) {
      setMsg(`Import errors: ${errors.slice(0, 3).join("; ")}`);
    }
    if (imported.length) {
      await store.upsertPriceItems(imported);
      await reload();
      setMsg(`Imported ${imported.length} Graybar item(s).`);
    }
    e.target.value = "";
  }

  async function resetSeed() {
    await store.replacePriceBook([...SEED_PRICE_BOOK]);
    await reload();
    setMsg("Reset to seed price book.");
  }

  const seedCount = items.filter((i) => i.costSource === "seed").length;

  return (
    <Screen title="Price book" subtitle="Seed now · Graybar CSV later">
      <Card className="space-y-2">
        <p className="text-sm">
          {items.length} items · <span className="text-warn">{seedCount} seeded (estimate)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-xl border border-hairline bg-white py-2 text-center text-sm">
            Import Graybar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          </label>
          <button
            onClick={() => download("pricebook.csv", priceBookToCsv(items))}
            className="rounded-xl border border-hairline bg-white py-2 text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => download("pricebook-template.csv", priceBookCsvTemplate())}
            className="rounded-xl border border-hairline bg-white py-2 text-sm"
          >
            Template
          </button>
          <button
            onClick={resetSeed}
            className="rounded-xl border border-hairline bg-white py-2 text-sm"
          >
            Reset to seed
          </button>
        </div>
        {msg && <p className="text-xs text-accent">{msg}</p>}
      </Card>

      <div className="mt-4 space-y-2">
        {items.map((i) => (
          <Card key={i.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{i.description}</div>
              <div className="text-[11px] text-subtle">
                {i.category} · {i.sku} · per {i.unit}
              </div>
              {i.costSource === "seed" && <EstimateBadge date={i.priceDate} />}
              {i.costSource === "graybar" && (
                <span className="text-[10px] text-ok">Graybar · {i.priceDate}</span>
              )}
            </div>
            <div className="text-right text-sm font-semibold">{money2(i.unitCost)}</div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

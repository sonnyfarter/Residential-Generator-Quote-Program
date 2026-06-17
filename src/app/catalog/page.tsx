"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { useCatalogStore } from "@/lib/catalog/useCatalog";
import { GENERAC_CATALOG } from "@/lib/catalog/generac";
import { catalogToCsv, catalogCsvTemplate, csvToCatalog } from "@/lib/catalog/csv";
import type { GeneratorModel } from "@/lib/types";
import { Screen, Card, money } from "@/components/ui";

export default function CatalogPage() {
  const store = useJob((s) => s.store);
  const init = useJob((s) => s.init);
  const [models, setModels] = useState<GeneratorModel[]>([]);
  const [usingImport, setUsingImport] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    store.getCatalog().then((c) => {
      setUsingImport(c.length > 0);
      setModels(c.length ? c : GENERAC_CATALOG);
    });
  }, [store]);

  async function reload() {
    const c = await store.getCatalog();
    setUsingImport(c.length > 0);
    setModels(c.length ? c : GENERAC_CATALOG);
    // refresh the shared catalog used across the app
    useCatalogStore.setState({ catalog: c.length ? c : GENERAC_CATALOG, loaded: true });
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
    const { models: imported, errors } = csvToCatalog(text);
    if (errors.length) setMsg(`Errors: ${errors.slice(0, 3).join("; ")}`);
    if (imported.length) {
      await store.replaceCatalog(imported);
      await reload();
      setMsg(`Imported ${imported.length} models.`);
    }
    e.target.value = "";
  }

  async function resetSeed() {
    await store.replaceCatalog([]);
    await reload();
    setMsg("Reverted to the built-in seed catalog.");
  }

  const missingCfh = models.filter((m) => !m.fuelCfh?.ng && !m.fuelCfh?.lp).length;

  return (
    <Screen title="Catalog" subtitle="Generator data — import real Generac specs">
      <Card className="space-y-2">
        <p className="text-sm">
          {models.length} models ·{" "}
          {usingImport ? (
            <span className="text-ok">imported</span>
          ) : (
            <span className="text-warn">built-in seed (MSRP provisional)</span>
          )}
        </p>
        {missingCfh > 0 && (
          <p className="text-[11px] text-warn">
            {missingCfh} model(s) have no full-load CFH — gas sizing will flag a
            missing input until you add it (per unit on the Takeoff screen, or in the CSV).
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-xl border border-hairline bg-white py-2 text-center text-sm">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          </label>
          <button onClick={() => download("catalog.csv", catalogToCsv(models))} className="rounded-xl border border-hairline bg-white py-2 text-sm">
            Export CSV
          </button>
          <button onClick={() => download("catalog-template.csv", catalogCsvTemplate())} className="rounded-xl border border-hairline bg-white py-2 text-sm">
            Template
          </button>
          <button onClick={resetSeed} className="rounded-xl border border-hairline bg-white py-2 text-sm">
            Reset to seed
          </button>
        </div>
        {msg && <p className="text-xs text-accent">{msg}</p>}
      </Card>

      <div className="mt-4 space-y-2">
        {models.map((m) => (
          <Card key={m.model} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-[11px] text-subtle">
                {m.model} · {m.kw}kW · {m.cat} · ATS {m.ats}A
              </div>
              <div className="text-[10px] text-subtle">
                CFH NG {m.fuelCfh?.ng ?? "—"} · LP {m.fuelCfh?.lp ?? "—"}
              </div>
            </div>
            <div className="text-right text-sm font-semibold">{money(m.msrp)}</div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

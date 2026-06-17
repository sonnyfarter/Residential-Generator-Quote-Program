"use client";

import { useEffect, useMemo, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { useCatalog } from "@/lib/catalog/useCatalog";
import { computeQuote } from "@/lib/pricing/computeQuote";
import { atsCostFor } from "@/lib/pricing/ats";
import { Screen, Card, Field, inputCls, PrimaryButton, money, money2 } from "@/components/ui";
import { useEngineState } from "@/lib/store/useEngine";

export default function QuotePage() {
  const { job, loading, init, update } = useJob();
  const { bom } = useEngineState();
  const { catalog, findModel } = useCatalog();
  const [showLevers, setShowLevers] = useState(false);
  useEffect(() => {
    init();
  }, [init]);

  const model = findModel(job?.selectedModel);

  const quote = useMemo(() => {
    if (!job || !model) return null;
    const atsCost = atsCostFor(job.house.serviceAmps);
    const hazardsCost = job.items
      .filter((i) => i.type === "hazard")
      .reduce((s, i) => s + (Number(i.values.estCost) || 0), 0);
    const fullBom = [...(job.engineBom ?? bom ?? []), ...(job.customLines ?? [])];
    return computeQuote({
      pricing: job.pricing,
      gensetMsrp: model.msrp,
      atsCost,
      items: job.items,
      bom: fullBom.length ? fullBom : undefined,
      hazardsCost,
    });
  }, [job, model, bom]);

  if (loading || !job) {
    return (
      <Screen title="Quote">
        <Card>Loading…</Card>
      </Screen>
    );
  }

  const p = job.pricing;

  return (
    <Screen title="Quote" subtitle="Pick a unit. Cost → markup → price.">
      <Card>
        <Field label="Generac unit">
          <select
            className={inputCls}
            value={job.selectedModel ?? ""}
            onChange={(e) =>
              update((j) => (j.selectedModel = e.target.value || undefined))
            }
          >
            <option value="">Select a model…</option>
            {catalog.map((g) => (
              <option key={g.model} value={g.model}>
                {g.name} · {g.kw}kW · {g.cat} · {money(g.msrp)} MSRP
              </option>
            ))}
          </select>
        </Field>
        {model && (
          <p className="mt-2 text-[11px] text-warn">
            MSRP provisional — verify against the Generac catalog. Genset cost
            basis ({(p.costPct * 100).toFixed(0)}% of MSRP) is UNVERIFIED.
          </p>
        )}
      </Card>

      {!model && (
        <p className="mt-4 text-sm text-subtle">
          Select a unit to see the cost-to-price breakdown.
        </p>
      )}

      {model && quote && (
        <>
          <Card className="mt-4">
            <Row label="Equipment cost" value={money2(quote.cost.equipment)} />
            <Row label="Labor cost" value={money2(quote.cost.labor)} />
            <Row
              label={`Materials cost${bom ? " (from takeoff)" : " (allowances)"}`}
              value={money2(quote.cost.materials)}
            />
            <Row label="Permits" value={money2(quote.cost.permits)} />
            {quote.cost.hazards > 0 && (
              <Row label="Hazards cost" value={money2(quote.cost.hazards)} />
            )}
            <div className="my-2 border-t border-hairline" />
            <Row label="Total cost" value={money2(quote.cost.total)} bold />
            <div className="my-2 border-t border-hairline" />
            <Row label="Quote price" value={money(quote.sell.total)} bold accent />
            <Row label="Profit" value={money(quote.profit)} />
            <Row label="Margin" value={`${quote.marginPct.toFixed(1)}%`} />
            {!quote.meetsTarget && (
              <p className="mt-2 rounded-lg bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
                SHORT by {money(quote.shortfall)} of the{" "}
                {money(p.profitTarget)} target.
              </p>
            )}
          </Card>

          <button
            onClick={() => setShowLevers((v) => !v)}
            className="mt-4 flex w-full items-center justify-between rounded-xl2 border border-hairline bg-white px-4 py-3 text-sm"
          >
            <span className="font-medium">Cost basis & markups</span>
            <span className="text-subtle">{showLevers ? "Hide" : "Adjust"}</span>
          </button>

          {showLevers && (
            <Card className="mt-3 space-y-4">
              <Field label="Genset cost mode">
                <select
                  className={inputCls}
                  value={p.costMode}
                  onChange={(e) =>
                    update((j) => (j.pricing.costMode = e.target.value as typeof p.costMode))
                  }
                >
                  <option value="pct">% of MSRP (unverified)</option>
                  <option value="asis">MSRP as-is</option>
                  <option value="fixed">Fixed cost</option>
                </select>
              </Field>
              {p.costMode === "pct" && (
                <LeverNum label="Cost % of MSRP" value={p.costPct} step={0.01}
                  onChange={(v) => update((j) => (j.pricing.costPct = v))} />
              )}
              {p.costMode === "fixed" && (
                <LeverNum label="Fixed genset cost" value={p.costFixed} step={1}
                  onChange={(v) => update((j) => (j.pricing.costFixed = v))} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <LeverNum label="Labor rate $/hr" value={p.laborRate} step={1}
                  onChange={(v) => update((j) => (j.pricing.laborRate = v))} />
                <LeverNum label="Permits" value={p.permits} step={1}
                  onChange={(v) => update((j) => (j.pricing.permits = v))} />
                <LeverNum label="Elec hours" value={p.elecHours} step={0.5}
                  onChange={(v) => update((j) => (j.pricing.elecHours = v))} />
                <LeverNum label="Plumb hours" value={p.plumbHours} step={0.5}
                  onChange={(v) => update((j) => (j.pricing.plumbHours = v))} />
                <LeverNum label="Equip markup" value={p.markupEquipment} step={0.05}
                  onChange={(v) => update((j) => (j.pricing.markupEquipment = v))} />
                <LeverNum label="Labor markup" value={p.markupLabor} step={0.05}
                  onChange={(v) => update((j) => (j.pricing.markupLabor = v))} />
                <LeverNum label="Materials markup" value={p.markupMaterials} step={0.05}
                  onChange={(v) => update((j) => (j.pricing.markupMaterials = v))} />
                <LeverNum label="Profit target" value={p.profitTarget} step={50}
                  onChange={(v) => update((j) => (j.pricing.profitTarget = v))} />
              </div>
            </Card>
          )}

          <div className="mt-6">
            <PrimaryButton href="/takeoff">Continue to Takeoff</PrimaryButton>
          </div>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={bold ? "font-semibold" : "text-subtle"}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${accent ? "text-accent text-lg" : ""}`}>{value}</span>
    </div>
  );
}

function LeverNum({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        className={inputCls}
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

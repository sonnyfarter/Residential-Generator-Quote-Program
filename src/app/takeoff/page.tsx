"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { useEngineState } from "@/lib/store/useEngine";
import { useCatalog } from "@/lib/catalog/useCatalog";
import { buildDeterministicTakeoff } from "@/lib/estimating/bom";
import { mergeAiIntoBom } from "@/lib/estimating/merge";
import type { AiTakeoffResponse, BomLine, DeterministicTakeoff } from "@/lib/types";
import { Screen, Card, PrimaryButton, money2 } from "@/components/ui";

export default function TakeoffPage() {
  const { job, loading, init, update } = useJob();
  const store = useJob((s) => s.store);
  const { findModel } = useCatalog();
  const { deterministic, ai, setResult } = useEngineState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (loading || !job) {
    return (
      <Screen title="Takeoff">
        <Card>Loading…</Card>
      </Screen>
    );
  }

  const model = findModel(job.selectedModel);

  async function buildBaseline(): Promise<DeterministicTakeoff | null> {
    if (!job || !model) return null;
    const priceBook = await store.getPriceBook();
    const existingGasBtu = job.gasAppliances.reduce((s, a) => s + (a.btu || 0), 0);
    const det = buildDeterministicTakeoff({
      model,
      house: { ...job.house, existingGasBtu },
      items: job.items,
      priceBook,
      fuelCfhOverride: job.gensetFuelCfh ?? null,
    });
    setResult({ bom: det.bom, deterministic: det, ai: null });
    await update((j) => (j.engineBom = det.bom));
    return det;
  }

  async function generate(withAi: boolean) {
    if (!job || !model) return;
    setError(null);
    setBusy(true);
    try {
      const det = await buildBaseline();
      if (!det) return;
      if (!withAi) {
        setAiUsed(false);
        setBusy(false);
        return;
      }
      // gather up to 8 photos as base64
      const photoIds = job.items.flatMap((i) => i.photoIds).slice(0, 8);
      const photos: string[] = [];
      for (const id of photoIds) {
        const p = await store.getPhoto(id);
        if (p) photos.push(await blobToDataUrl(p.blob));
      }
      const res = await fetch("/api/takeoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inputs: {
            customer: job.customer,
            house: job.house,
            model: { model: model.model, name: model.name, kw: model.kw },
            gasAppliances: job.gasAppliances,
          },
          deterministic: det,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status}).`);
        setAiUsed(false);
        return;
      }
      const aiResp = data.ai as AiTakeoffResponse;
      const priceBook = await store.getPriceBook();
      const merged = mergeAiIntoBom(det, aiResp, priceBook);
      setResult({ bom: merged, deterministic: det, ai: aiResp });
      await update((j) => {
        j.ai = aiResp;
        j.engineBom = merged;
      });
      setAiUsed(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!model) {
    return (
      <Screen title="Takeoff" subtitle="Generate the priced parts list">
        <Card>
          <p className="text-sm text-subtle">
            Select a Generac unit on the Quote screen first — generation is
            blocked until a unit is chosen.
          </p>
          <div className="mt-4">
            <PrimaryButton href="/quote">Go to Quote</PrimaryButton>
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Takeoff" subtitle={`${model.name} · ${job.house.fuel.toUpperCase()} · ${job.house.serviceAmps}A`}>
      <Card className="space-y-2">
        <ConfirmRow label="Generator" value={`${model.name} (${model.kw} kW)`} />
        <ConfirmRow label="Service" value={`${job.house.serviceAmps} A`} />
        <ConfirmRow label="Gen → panel" value={`${job.house.distGenPanelFt} ft`} />
        <ConfirmRow label="Gen → elec meter" value={`${job.house.distGenElecMeterFt} ft`} />
        <ConfirmRow label="Gen → gas meter" value={`${job.house.distGenGasFt} ft`} />
        <ConfirmRow label="Fuel" value={job.house.fuel.toUpperCase()} />
        <div className="border-t border-hairline pt-2">
          <label className="block text-xs font-medium text-subtle">
            Generator full-load fuel — {job.house.fuel.toUpperCase()} (CFH, from spec sheet)
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-hairline bg-canvas px-3 py-2 text-base outline-none focus:border-accent"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 220 — leave blank if unknown"
            value={job.gensetFuelCfh ?? ""}
            onChange={(e) =>
              update((j) => (j.gensetFuelCfh = e.target.value === "" ? null : Number(e.target.value)))
            }
          />
          <p className="mt-1 text-[11px] text-subtle">
            Enter the unit&apos;s nameplate/spec consumption to size the gas line.
            Left blank, the takeoff flags it as a missing input rather than guessing.
          </p>
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        <PrimaryButton onClick={() => generate(true)} disabled={busy}>
          {busy ? "Generating…" : "Generate AI-refined takeoff"}
        </PrimaryButton>
        <button
          onClick={() => generate(false)}
          disabled={busy}
          className="w-full rounded-2xl border border-hairline bg-white py-3 text-sm font-medium"
        >
          Deterministic only (no AI)
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-xs text-bad">
          {error}
        </p>
      )}

      {deterministic && (
        <DeterministicSummary det={deterministic} />
      )}

      {job.engineBom && job.engineBom.length > 0 && (
        <BomTable
          bom={job.engineBom}
          title="Priced BOM — tap a qty or cost to edit"
          onEdit={(idx, change) =>
            update((j) => {
              const line = j.engineBom![idx];
              const qty = change.qty ?? line.qty;
              const unitCost = change.unitCost ?? line.unitCost;
              j.engineBom![idx] = {
                ...line,
                qty,
                unitCost,
                lineCost: Math.round(qty * unitCost * 100) / 100,
                costSource: change.unitCost !== undefined ? "manual" : line.costSource,
              };
            })
          }
        />
      )}

      <CustomLines
        lines={job.customLines ?? []}
        onAdd={(line) =>
          update((j) => {
            j.customLines = [...(j.customLines ?? []), line];
          })
        }
        onRemove={(idx) =>
          update((j) => {
            j.customLines = (j.customLines ?? []).filter((_, i) => i !== idx);
          })
        }
      />

      {aiUsed && ai && <AiPanel ai={ai} />}

      {((job.engineBom && job.engineBom.length > 0) ||
        (job.customLines && job.customLines.length > 0)) && (
        <div className="mt-6">
          <PrimaryButton href="/reports">View reports</PrimaryButton>
        </div>
      )}
    </Screen>
  );
}

function CustomLines({
  lines,
  onAdd,
  onRemove,
}: {
  lines: BomLine[];
  onAdd: (line: BomLine) => void;
  onRemove: (idx: number) => void;
}) {
  const [scope, setScope] = useState<"electrical" | "gas">("electrical");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("ea");
  const [cost, setCost] = useState(0);

  function add() {
    if (!desc.trim()) return;
    onAdd({
      scope,
      description: desc.trim(),
      qty,
      unit: unit as BomLine["unit"],
      unitCost: cost,
      lineCost: Math.round(qty * cost * 100) / 100,
      costSource: "manual",
      confidence: "high",
    });
    setDesc("");
    setQty(1);
    setCost(0);
  }

  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">Manual line items</h2>
      <p className="mb-3 text-[11px] text-subtle">
        Add anything the engine didn&apos;t capture (extra materials, sub work,
        rentals). These flow into the materials cost and the internal report.
      </p>
      {lines.length > 0 && (
        <div className="mb-3 divide-y divide-hairline">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="flex-1">
                {l.description}{" "}
                <span className="text-[10px] text-subtle">
                  {l.qty} {l.unit} · {l.scope}
                </span>
              </span>
              <span className="mr-2">{money2(l.lineCost)}</span>
              <button className="text-bad" onClick={() => onRemove(i)} aria-label="remove">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="Description (e.g. Core drill 8in wall)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <select
            className="rounded-xl border border-hairline bg-canvas px-2 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as "electrical" | "gas")}
          >
            <option value="electrical">Elec</option>
            <option value="gas">Gas</option>
          </select>
          <input
            className="rounded-xl border border-hairline bg-canvas px-2 py-2 text-sm"
            type="number"
            inputMode="decimal"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
          <input
            className="rounded-xl border border-hairline bg-canvas px-2 py-2 text-sm"
            placeholder="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <input
            className="rounded-xl border border-hairline bg-canvas px-2 py-2 text-sm"
            type="number"
            inputMode="decimal"
            placeholder="$/unit"
            value={cost || ""}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </div>
        <button
          onClick={add}
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white active:opacity-80"
        >
          Add line item
        </button>
      </div>
    </Card>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-subtle">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DeterministicSummary({ det }: { det: DeterministicTakeoff }) {
  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">Engineering (deterministic)</h2>
      <div className="space-y-1 text-sm">
        <ConfirmRow label="Load current" value={`${det.electrical.loadAmps} A`} />
        <ConfirmRow label="Sized (125%)" value={`${det.electrical.sizedAmps} A`} />
        <ConfirmRow
          label="Feeder"
          value={`#${det.electrical.conductor.awg} ${det.electrical.conductor.material} · VD ${det.electrical.vdPercent}%`}
        />
        <ConfirmRow label="Conduit" value={det.electrical.conduitTrade} />
        <ConfirmRow
          label="Gas CFH"
          value={det.gas.cfh != null ? `${det.gas.cfh}` : "— (missing spec)"}
        />
        <ConfirmRow
          label="Gas pipe"
          value={det.gas.pipeSizeIn != null ? `${det.gas.pipeSizeIn}" ${det.gas.pipeMaterial}` : "— pending"}
        />
      </div>
      {det.missingInputs.length > 0 && (
        <div className="mt-3 rounded-lg bg-warn/10 p-2 text-xs text-warn">
          <strong>Missing inputs:</strong>
          <ul className="ml-4 list-disc">
            {det.missingInputs.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {det.flags.length > 0 && (
        <div className="mt-2 space-y-1 text-xs">
          {det.flags.map((f, i) => (
            <div
              key={i}
              className={
                f.severity === "code"
                  ? "rounded bg-bad/10 px-2 py-1 text-bad"
                  : f.severity === "warn"
                  ? "rounded bg-warn/10 px-2 py-1 text-warn"
                  : "text-subtle"
              }
            >
              {f.severity === "code" ? "⚠ CODE: " : ""}
              {f.message}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BomTable({
  bom,
  title = "Priced BOM",
  onEdit,
}: {
  bom: BomLine[];
  title?: string;
  onEdit?: (idx: number, change: { qty?: number; unitCost?: number }) => void;
}) {
  const total = bom.reduce((s, l) => s + l.lineCost, 0);
  const editCls =
    "w-16 rounded border border-hairline bg-canvas px-1 py-0.5 text-[11px] outline-none focus:border-accent";
  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="divide-y divide-hairline">
        {bom.map((l, i) => (
          <div key={i} className="py-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{l.description}</span>
              <span>{money2(l.lineCost)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-subtle">
              {onEdit ? (
                <>
                  <input
                    className={editCls}
                    type="number"
                    inputMode="decimal"
                    value={l.qty}
                    onChange={(e) => onEdit(i, { qty: Number(e.target.value) })}
                    aria-label="quantity"
                  />
                  <span>{l.unit} ×</span>
                  <input
                    className={editCls}
                    type="number"
                    inputMode="decimal"
                    value={l.unitCost}
                    onChange={(e) => onEdit(i, { unitCost: Number(e.target.value) })}
                    aria-label="unit cost"
                  />
                </>
              ) : (
                <span>
                  {l.qty} {l.unit} × {money2(l.unitCost)}
                </span>
              )}
              <SourceTag source={l.costSource} />
              <ConfTag c={l.confidence} />
              {l.needsVerification && (
                <span className="rounded bg-warn/10 px-1 text-warn">verify</span>
              )}
            </div>
            {l.note && <p className="text-[10px] text-warn">{l.note}</p>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-hairline pt-2 text-sm font-semibold">
        <span>Materials total</span>
        <span>{money2(total)}</span>
      </div>
    </Card>
  );
}

function SourceTag({ source }: { source: BomLine["costSource"] }) {
  const map: Record<string, string> = {
    seed: "bg-warn/10 text-warn",
    graybar: "bg-ok/10 text-ok",
    manual: "bg-accent/10 text-accent",
    none: "bg-bad/10 text-bad",
  };
  return <span className={`rounded px-1 ${map[source]}`}>{source}</span>;
}

function ConfTag({ c }: { c: BomLine["confidence"] }) {
  return <span className="rounded bg-hairline px-1 text-ink">{c}</span>;
}

function AiPanel({ ai }: { ai: AiTakeoffResponse }) {
  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">AI refinement</h2>
      <p className="text-sm">{ai.job_summary}</p>
      {ai.distance_adjustments.length > 0 && (
        <div className="mt-3 text-xs">
          <strong>Distance checks</strong>
          {ai.distance_adjustments.map((d, i) => (
            <div key={i} className="text-subtle">
              {d.path}: entered {d.entered_ft} → est {d.estimated_ft} ft ({d.confidence}) — {d.basis}
            </div>
          ))}
        </div>
      )}
      {ai.flags.length > 0 && (
        <ul className="mt-3 ml-4 list-disc text-xs text-warn">
          {ai.flags.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {ai.missing_inputs.length > 0 && (
        <ul className="mt-2 ml-4 list-disc text-xs text-subtle">
          {ai.missing_inputs.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] text-subtle">
        Labor delta — elec {ai.labor_hours_delta.electrical}h, gas{" "}
        {ai.labor_hours_delta.gas}h, site {ai.labor_hours_delta.site}h.{" "}
        {ai.labor_hours_delta.rationale}
      </p>
      {ai.disclaimer && (
        <p className="mt-2 text-[10px] italic text-subtle">{ai.disclaimer}</p>
      )}
    </Card>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { useEngineState } from "@/lib/store/useEngine";
import { findModel } from "@/lib/catalog/generac";
import { buildDeterministicTakeoff } from "@/lib/estimating/bom";
import { mergeAiIntoBom } from "@/lib/estimating/merge";
import type { AiTakeoffResponse, BomLine, DeterministicTakeoff } from "@/lib/types";
import { Screen, Card, PrimaryButton, money2 } from "@/components/ui";

export default function TakeoffPage() {
  const { job, loading, init, update } = useJob();
  const store = useJob((s) => s.store);
  const { bom, deterministic, ai, setResult } = useEngineState();
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
    });
    setResult({ bom: det.bom, deterministic: det, ai: null });
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
      await update((j) => (j.ai = aiResp));
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
        <ConfirmRow label="Elec run" value={`${job.house.elecRunFt} ft`} />
        <ConfirmRow label="Gas run" value={`${job.house.gasRunFt} ft`} />
        <ConfirmRow label="Fuel" value={job.house.fuel.toUpperCase()} />
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

      {bom && <BomTable bom={bom} />}

      {aiUsed && ai && <AiPanel ai={ai} />}

      {bom && (
        <div className="mt-6">
          <PrimaryButton href="/reports">View reports</PrimaryButton>
        </div>
      )}
    </Screen>
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

function BomTable({ bom }: { bom: BomLine[] }) {
  const total = bom.reduce((s, l) => s + l.lineCost, 0);
  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">Priced BOM</h2>
      <div className="divide-y divide-hairline">
        {bom.map((l, i) => (
          <div key={i} className="py-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{l.description}</span>
              <span>{money2(l.lineCost)}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-subtle">
              <span>
                {l.qty} {l.unit} × {money2(l.unitCost)}
              </span>
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

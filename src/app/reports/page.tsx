"use client";

import { useEffect, useMemo, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { useEngineState } from "@/lib/store/useEngine";
import { findModel } from "@/lib/catalog/generac";
import { computeQuote } from "@/lib/pricing/computeQuote";
import { atsCostFor } from "@/lib/pricing/ats";
import { Screen, Card, money, money2 } from "@/components/ui";
import { ReportPhotos } from "@/components/ReportPhotos";
import type { BomLine } from "@/lib/types";

type ReportKind = "contractor" | "customer" | "internal";

export default function ReportsPage() {
  const { job, loading, init } = useJob();
  const { bom, deterministic, ai } = useEngineState();
  const [kind, setKind] = useState<ReportKind>("customer");
  useEffect(() => {
    init();
  }, [init]);

  const model = findModel(job?.selectedModel);
  const quote = useMemo(() => {
    if (!job || !model) return null;
    const hazardsCost = job.items
      .filter((i) => i.type === "hazard")
      .reduce((s, i) => s + (Number(i.values.estCost) || 0), 0);
    return computeQuote({
      pricing: job.pricing,
      gensetMsrp: model.msrp,
      atsCost: atsCostFor(job.house.serviceAmps),
      items: job.items,
      bom: bom ?? undefined,
      hazardsCost,
    });
  }, [job, model, bom]);

  if (loading || !job) {
    return (
      <Screen title="Reports">
        <Card>Loading…</Card>
      </Screen>
    );
  }
  if (!model || !quote) {
    return (
      <Screen title="Reports">
        <Card className="text-sm text-subtle">
          Select a unit and generate a takeoff to produce reports.
        </Card>
      </Screen>
    );
  }

  const customerEmail = job.customer.email;
  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <Screen title="Reports" subtitle="One renders at a time for clean printing">
      <div className="no-print mb-4 grid grid-cols-3 gap-2">
        {(["contractor", "customer", "internal"] as ReportKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-xl py-2 text-xs font-medium capitalize ${
              kind === k ? "bg-accent text-white" : "border border-hairline bg-white"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="no-print mb-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-hairline bg-white py-2 text-sm"
        >
          Print
        </button>
        {kind === "customer" && (
          <a
            href={`mailto:${customerEmail}?subject=${encodeURIComponent(
              "Your standby generator proposal"
            )}`}
            className="flex-1 rounded-xl border border-hairline bg-white py-2 text-center text-sm"
          >
            Email customer
          </a>
        )}
      </div>

      {kind === "contractor" && (
        <ContractorReport job={job} model={model} det={deterministic} bom={bom} onCopy={copy} />
      )}
      {kind === "customer" && (
        <CustomerReport job={job} model={model} price={quote.sell.total} onCopy={copy} />
      )}
      {kind === "internal" && (
        <InternalReport job={job} model={model} quote={quote} bom={bom} ai={ai} onCopy={copy} />
      )}
    </Screen>
  );
}

// ── Contractor: scopes + site, NO pricing ────────────────────────────────────
function ContractorReport({ job, model, det, bom, onCopy }: any) {
  const elecBom: BomLine[] = (bom ?? []).filter((l: BomLine) => l.scope === "electrical");
  const gasBom: BomLine[] = (bom ?? []).filter((l: BomLine) => l.scope === "gas");
  return (
    <Card>
      <ReportHeader title="Project Information Form" job={job} />
      <Section title="Proposed system">
        {model.name} · {model.kw} kW {model.cat}-cooled · {job.house.serviceAmps}A service · {job.house.fuel.toUpperCase()}
      </Section>
      {det && (
        <Section title="Electrical scope">
          <ScopeList lines={elecBom} />
          <p className="mt-1 text-xs text-subtle">
            Feeder #{det.electrical.conductor.awg} {det.electrical.conductor.material},{" "}
            {det.electrical.conduitTrade} conduit, VD {det.electrical.vdPercent}%.
          </p>
        </Section>
      )}
      {det && (
        <Section title="Gas scope">
          <ScopeList lines={gasBom} />
          <p className="mt-1 text-xs text-subtle">
            {det.gas.pipeSizeIn ? `${det.gas.pipeSizeIn}" ${det.gas.pipeMaterial}` : "Pipe size pending spec-sheet CFH"}.
          </p>
        </Section>
      )}
      <Section title="Generator siting">
        {job.items.find((i: any) => i.type === "generator")?.values?.notes || "See photos."}
      </Section>
      <Section title="Site conditions & hazards">
        <ReportPhotos jobId={job.id} />
      </Section>
      <CopyBar onCopy={() => onCopy(`Project Information Form — ${job.customer.name}`)} />
    </Card>
  );
}

// ── Customer: marked-up SELL only ────────────────────────────────────────────
function CustomerReport({ job, model, price, onCopy }: any) {
  return (
    <Card>
      <div className="mb-3 border-b border-hairline pb-3">
        <div className="text-lg font-semibold">Standby Power Proposal</div>
        <div className="text-sm text-subtle">{job.customer.name}</div>
        <div className="text-xs text-subtle">{job.customer.address}</div>
        <div className="text-xs text-subtle">{job.customer.date}</div>
      </div>
      <Section title="Proposed system">
        {model.name} — {model.kw} kW automatic standby generator with{" "}
        {job.house.serviceAmps}A service-rated automatic transfer switch. Turnkey
        installation including electrical and gas connection, permits, and startup.
      </Section>
      <Section title="What's included">
        <ul className="ml-4 list-disc text-sm">
          <li>Automatic standby generator, set & leveled</li>
          <li>Service-rated automatic transfer switch</li>
          <li>Electrical feeder, conduit, grounding & connection</li>
          <li>Gas line connection & startup</li>
          <li>Permits and inspection coordination</li>
        </ul>
      </Section>
      <div className="my-4 rounded-xl2 bg-canvas p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-subtle">
          Turnkey investment
        </div>
        <div className="text-3xl font-bold text-accent">{money(price)}</div>
      </div>
      <p className="text-xs text-subtle">
        Proposal valid 30 days. Final price subject to site verification and permit
        requirements.
      </p>
      <CopyBar onCopy={() => onCopy(`Standby proposal for ${job.customer.name}: ${money(price)}`)} />
    </Card>
  );
}

// ── Internal: full cost→sell→profit, DO NOT SEND ─────────────────────────────
function InternalReport({ job, model, quote, bom, ai, onCopy }: any) {
  return (
    <Card>
      <div className="mb-3 rounded-lg bg-bad px-3 py-2 text-center text-sm font-bold text-white">
        INTERNAL — DO NOT SEND
      </div>
      <ReportHeader title="Internal Cost Sheet" job={job} />
      <Section title="Unit">
        {model.name} · MSRP {money(model.msrp)}{" "}
        <span className="text-warn">(provisional — verify)</span>
      </Section>
      <div className="text-sm">
        <Line l="Equipment" c={quote.cost.equipment} s={quote.sell.equipment} />
        <Line l="Labor" c={quote.cost.labor} s={quote.sell.labor} />
        <Line l="Materials" c={quote.cost.materials} s={quote.sell.materials} />
        <Line l="Permits" c={quote.cost.permits} s={quote.sell.permits} />
        <Line l="Hazards" c={quote.cost.hazards} s={quote.sell.hazards} />
        <div className="my-1 border-t border-hairline" />
        <Line l="TOTAL" c={quote.cost.total} s={quote.sell.total} bold />
      </div>
      <div className="mt-2 flex justify-between text-sm font-semibold">
        <span>Profit</span>
        <span className={quote.meetsTarget ? "text-ok" : "text-bad"}>
          {money(quote.profit)} · {quote.marginPct.toFixed(1)}%
        </span>
      </div>
      {!quote.meetsTarget && (
        <p className="mt-1 rounded bg-warn/10 px-2 py-1 text-xs text-warn">
          SHORT by {money(quote.shortfall)} of {money(job.pricing.profitTarget)} target.
        </p>
      )}
      {quote.gensetCostUnverified && (
        <p className="mt-1 text-[10px] text-warn">
          Genset cost basis = MSRP × {(job.pricing.costPct * 100).toFixed(0)}% (UNVERIFIED).
        </p>
      )}

      <Section title="BOM — price source per line">
        {bom ? (
          <div className="divide-y divide-hairline text-xs">
            {bom.map((l: BomLine, i: number) => (
              <div key={i} className="flex justify-between py-1">
                <span>
                  {l.description}{" "}
                  <span className="text-subtle">
                    [{l.costSource}
                    {l.needsVerification ? " · verify" : ""}]
                  </span>
                </span>
                <span>{money2(l.lineCost)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-subtle">No takeoff generated — using flat allowances.</p>
        )}
      </Section>

      <Section title="All site photos">
        <ReportPhotos jobId={job.id} />
      </Section>
      <CopyBar onCopy={() => onCopy(`Internal: price ${money(quote.sell.total)} profit ${money(quote.profit)}`)} />
      {void ai}
    </Card>
  );
}

// ── shared bits ──
function ReportHeader({ title, job }: { title: string; job: any }) {
  return (
    <div className="mb-3 border-b border-hairline pb-3">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm">{job.customer.name}</div>
      <div className="text-xs text-subtle">
        {job.customer.address} · {job.customer.phone}
      </div>
      <div className="text-xs text-subtle">
        {job.customer.date} · Rep: {job.customer.rep || "—"}
      </div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-card mb-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
        {title}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function ScopeList({ lines }: { lines: BomLine[] }) {
  if (!lines.length) return <p className="text-xs text-subtle">—</p>;
  return (
    <ul className="ml-4 list-disc text-sm">
      {lines.map((l, i) => (
        <li key={i}>
          {l.qty} {l.unit} — {l.description}
        </li>
      ))}
    </ul>
  );
}
function Line({ l, c, s, bold }: { l: string; c: number; s: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-semibold" : ""}`}>
      <span>{l}</span>
      <span className="tabular-nums">
        <span className="text-subtle">{money2(c)}</span> → {money2(s)}
      </span>
    </div>
  );
}
function CopyBar({ onCopy }: { onCopy: () => void }) {
  return (
    <button
      onClick={onCopy}
      className="no-print mt-4 w-full rounded-xl border border-hairline bg-white py-2 text-sm"
    >
      Copy summary
    </button>
  );
}

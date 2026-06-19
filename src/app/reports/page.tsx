"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reportElementToPdfBase64 } from "@/lib/pdf";
import { useJob } from "@/lib/store/useJob";
import { useEngineState } from "@/lib/store/useEngine";
import { useCatalog } from "@/lib/catalog/useCatalog";
import { computeQuote } from "@/lib/pricing/computeQuote";
import { atsCostFor } from "@/lib/pricing/ats";
import { Screen, Card, money, money2 } from "@/components/ui";
import { ReportPhotos } from "@/components/ReportPhotos";
import { SiteDiagramView } from "@/components/SiteDiagramView";
import type { BomLine, CompanyProfile } from "@/lib/types";

type ReportKind = "contractor" | "customer" | "internal";

export default function ReportsPage() {
  const { job, loading, init } = useJob();
  const store = useJob((s) => s.store);
  const { bom, deterministic, ai } = useEngineState();
  const { findModel } = useCatalog();
  const [kind, setKind] = useState<ReportKind>("customer");
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    store.getCompany().then((c) => setCompany(c ?? null));
  }, [store]);
  useEffect(() => {
    if (company?.logo) {
      const u = URL.createObjectURL(company.logo);
      setLogoUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setLogoUrl(null);
  }, [company]);

  // Persisted (possibly edited) engine BOM + manually added lines.
  const fullBom = useMemo(
    () => [...(job?.engineBom ?? bom ?? []), ...(job?.customLines ?? [])],
    [bom, job]
  );

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
      bom: fullBom.length ? fullBom : undefined,
      hazardsCost,
    });
  }, [job, model, fullBom]);

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
  const pmEmail = company?.pmEmail ?? "";

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  async function sendEmail(to: string, subject: string, body: string, filename: string) {
    if (!to || !captureRef.current) return;
    setSending(true);
    setSendMsg(null);
    try {
      const pdfBase64 = await reportElementToPdfBase64(captureRef.current);
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, subject, body, pdfBase64, filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendMsg({ ok: false, text: data.error ?? `Failed (${res.status})` });
      } else {
        setSendMsg({ ok: true, text: `Sent to ${to}` });
      }
    } catch (e) {
      setSendMsg({ ok: false, text: String(e) });
    } finally {
      setSending(false);
    }
  }

  // ── Email subjects/bodies (shared by the send-with-PDF and mailto paths) ──
  function customerSubject() {
    return `Standby generator proposal — ${job!.customer.name}`;
  }
  function customerBody() {
    return [
      `Hi ${job!.customer.name || "there"},`,
      "",
      "Thank you for the opportunity. Your standby power proposal is attached as a PDF.",
      "",
      `Proposed system: ${model!.name} (${model!.kw} kW), ${job!.house.serviceAmps}A automatic transfer switch.`,
      `Turnkey investment: ${money(quote!.sell.total)}`,
      "",
      company?.name ? `${company.name}` : "",
      [company?.phone, company?.email].filter(Boolean).join(" · "),
      company?.license ? `Lic# ${company.license}` : "",
    ]
      .filter((l) => l !== "")
      .join("\n");
  }
  function pmSubject() {
    return `Install packet — ${job!.customer.name} (${model!.name})`;
  }
  function pmBody() {
    return [
      `Project: ${job!.customer.name}`,
      `Address: ${job!.customer.address}`,
      `System: ${model!.name} (${model!.kw} kW), ${job!.house.serviceAmps}A, ${job!.house.fuel.toUpperCase()}`,
      `Gen→panel ${job!.house.distGenPanelFt}ft · Gen→elec mtr ${job!.house.distGenElecMeterFt}ft · Gen→gas mtr ${job!.house.distGenGasFt}ft`,
      "",
      "Full install packet (scopes, distances, site photos) attached as a PDF.",
    ].join("\n");
  }

  // Fallback "open in mail app" links (no attachment — that path uses the API).
  function customerMailto(): string {
    return `mailto:${customerEmail}?subject=${encodeURIComponent(customerSubject())}&body=${encodeURIComponent(customerBody())}`;
  }
  function pmMailto(): string {
    return `mailto:${pmEmail}?subject=${encodeURIComponent(pmSubject())}&body=${encodeURIComponent(pmBody())}`;
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

      <div className="no-print mb-2 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-hairline bg-white py-2 text-sm"
        >
          Print / PDF
        </button>
        {kind === "customer" && (
          <button
            onClick={() => sendEmail(customerEmail, customerSubject(), customerBody(), `Proposal-${slug(job!.customer.name)}.pdf`)}
            disabled={!customerEmail || sending}
            className="flex-1 rounded-xl bg-accent py-2 text-center text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? "Sending…" : "Email customer (PDF)"}
          </button>
        )}
        {kind === "contractor" && (
          <button
            onClick={() => sendEmail(pmEmail, pmSubject(), pmBody(), `Install-Packet-${slug(job!.customer.name)}.pdf`)}
            disabled={!pmEmail || sending}
            className="flex-1 rounded-xl bg-accent py-2 text-center text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? "Sending…" : pmEmail ? "Email PM (PDF)" : "Set PM email in Settings"}
          </button>
        )}
      </div>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        {kind !== "internal" && (
          <a
            href={kind === "customer" ? customerMailto() : pmMailto()}
            className="text-xs text-accent underline"
          >
            Open in mail app instead
          </a>
        )}
        {sendMsg && (
          <span className={`text-xs ${sendMsg.ok ? "text-ok" : "text-bad"}`}>{sendMsg.text}</span>
        )}
      </div>

      <div ref={captureRef} id="printArea">
        {kind === "contractor" && (
          <ContractorReport job={job} model={model} det={deterministic} bom={fullBom} company={company} logoUrl={logoUrl} onCopy={copy} />
        )}
        {kind === "customer" && (
          <CustomerReport job={job} model={model} price={quote.sell.total} company={company} logoUrl={logoUrl} onCopy={copy} />
        )}
        {kind === "internal" && (
          <InternalReport job={job} model={model} quote={quote} bom={fullBom} ai={ai} company={company} logoUrl={logoUrl} onCopy={copy} />
        )}
      </div>
    </Screen>
  );
}

function slug(s: string): string {
  return (s || "job").trim().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "job";
}

// Branded letterhead shown on every report.
function Letterhead({ company, logoUrl }: { company: CompanyProfile | null; logoUrl: string | null }) {
  if (!company && !logoUrl) return null;
  return (
    <div className="mb-3 flex items-center gap-3 border-b border-hairline pb-3">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="logo" className="h-12 w-12 object-contain" />
      )}
      <div className="leading-tight">
        <div className="text-sm font-semibold">{company?.name}</div>
        <div className="text-[11px] text-subtle">
          {[company?.phone, company?.email].filter(Boolean).join(" · ")}
        </div>
        {company?.license && (
          <div className="text-[11px] text-subtle">Lic# {company.license}</div>
        )}
      </div>
    </div>
  );
}

// ── Contractor: scopes + site, NO pricing ────────────────────────────────────
function ContractorReport({ job, model, det, bom, company, logoUrl, onCopy }: any) {
  const elecBom: BomLine[] = (bom ?? []).filter((l: BomLine) => l.scope === "electrical");
  const gasBom: BomLine[] = (bom ?? []).filter((l: BomLine) => l.scope === "gas");
  return (
    <Card>
      <Letterhead company={company} logoUrl={logoUrl} />
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
      <Section title="Generator site layout & measurements">
        <SiteDiagramView
          items={job.items}
          layout={job.diagram}
          distances={{ panel: job.house.distGenPanelFt, gas: job.house.distGenGasFt, elec: job.house.distGenElecMeterFt }}
        />
      </Section>
      <Section title="Site conditions & hazards">
        <ReportPhotos jobId={job.id} />
      </Section>
      <CopyBar onCopy={() => onCopy(`Project Information Form — ${job.customer.name}`)} />
    </Card>
  );
}

// ── Customer: marked-up SELL only ────────────────────────────────────────────
function CustomerReport({ job, model, price, company, logoUrl, onCopy }: any) {
  return (
    <Card>
      <Letterhead company={company} logoUrl={logoUrl} />
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
      <Section title="Proposed generator location">
        <SiteDiagramView
          items={job.items}
          layout={job.diagram}
          distances={{ panel: job.house.distGenPanelFt, gas: job.house.distGenGasFt, elec: job.house.distGenElecMeterFt }}
        />
      </Section>
      <div className="my-4 overflow-hidden rounded-xl2 border border-accent/20">
        <div className="bg-accent px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
          Turnkey investment
        </div>
        <div className="bg-canvas px-4 py-4 text-center">
          <div className="text-4xl font-bold text-accent">{money(price)}</div>
          <div className="mt-1 text-[11px] text-subtle">
            Complete installation — equipment, labor, permits & startup
          </div>
        </div>
      </div>
      <Section title="Acceptance">
        <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-subtle">
          <div className="border-t border-ink pt-1">Customer signature / date</div>
          <div className="border-t border-ink pt-1">
            {company?.name || "Company"} representative / date
          </div>
        </div>
      </Section>
      <p className="mt-2 text-[11px] text-subtle">
        Proposal valid 30 days. Final price subject to site verification and permit
        requirements.
      </p>
      <CopyBar onCopy={() => onCopy(`Standby proposal for ${job.customer.name}: ${money(price)}`)} />
    </Card>
  );
}

// ── Internal: full cost→sell→profit, DO NOT SEND ─────────────────────────────
function InternalReport({ job, model, quote, bom, ai, company, logoUrl, onCopy }: any) {
  return (
    <Card>
      <div className="mb-3 rounded-lg bg-bad px-3 py-2 text-center text-sm font-bold text-white">
        INTERNAL — DO NOT SEND
      </div>
      <Letterhead company={company} logoUrl={logoUrl} />
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

      <Section title="Generator site layout & measurements">
        <SiteDiagramView
          items={job.items}
          layout={job.diagram}
          distances={{ panel: job.house.distGenPanelFt, gas: job.house.distGenGasFt, elec: job.house.distGenElecMeterFt }}
        />
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

"use client";

import type { SurveyItem, DiagramLayout } from "@/lib/types";

// Read-only render of the site diagram for reports/PDF — home footprint, item
// markers, and the generator→meter/panel distance links with measurements.
// Mirrors the interactive SiteDiagram layout but with no pointer handlers.

const META: Record<string, { label: string; name: string; color: string }> = {
  generator: { label: "GEN", name: "Generator", color: "#34c759" },
  electric_meter: { label: "E", name: "Elec meter", color: "#0a84ff" },
  gas_meter: { label: "G", name: "Gas meter", color: "#ff9f0a" },
  panel: { label: "P", name: "Main panel", color: "#5e5ce6" },
  hvac: { label: "H", name: "HVAC", color: "#6e6e73" },
  hazard: { label: "!", name: "Hazard", color: "#ff3b30" },
};

const DEFAULT_RING: Record<string, { x: number; y: number }> = {
  electric_meter: { x: 16, y: 28 },
  gas_meter: { x: 84, y: 28 },
  generator: { x: 84, y: 74 },
  panel: { x: 16, y: 74 },
  hvac: { x: 50, y: 90 },
  hazard: { x: 50, y: 10 },
};

const DEFAULT_HOUSE: DiagramLayout["house"] = { x: 30, y: 35, w: 40, h: 30 };

export function SiteDiagramView({
  items,
  layout,
  distances,
}: {
  items: SurveyItem[];
  layout?: DiagramLayout;
  distances?: { panel?: number; gas?: number; elec?: number };
}) {
  const present = items.filter((i) => META[i.type]);
  const house = layout?.house ?? DEFAULT_HOUSE;
  const pinOf = (it: SurveyItem) =>
    it.pin ?? DEFAULT_RING[it.type] ?? { x: 50, y: 50 };
  const gen = present.find((i) => i.type === "generator");
  const genPos = gen ? pinOf(gen) : undefined;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-hairline bg-white">
        {/* North arrow */}
        <div className="absolute right-2 top-2 flex flex-col items-center text-subtle">
          <span className="text-sm leading-none">↑</span>
          <span className="text-[9px] font-semibold leading-none">N</span>
        </div>
        {genPos && (
          <svg className="absolute inset-0 h-full w-full">
            {present
              .filter((i) => ["panel", "gas_meter", "electric_meter"].includes(i.type))
              .map((i) => {
                const p = pinOf(i);
                const dist = Number(i.values.distanceFt);
                return (
                  <g key={i.id}>
                    <line
                      x1={`${genPos.x}%`} y1={`${genPos.y}%`}
                      x2={`${p.x}%`} y2={`${p.y}%`}
                      stroke="#aeaeb2" strokeWidth={1.5} strokeDasharray="4 3"
                    />
                    {Number.isFinite(dist) && dist > 0 && (
                      <text
                        x={`${(genPos.x + p.x) / 2}%`} y={`${(genPos.y + p.y) / 2}%`}
                        fill="#3a3a3c" fontSize="10" fontWeight="600" textAnchor="middle" dy="-2"
                      >
                        {dist} ft
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        )}

        <div
          className="absolute rounded-md border-2 border-hairline bg-canvas/60"
          style={{ left: `${house.x}%`, top: `${house.y}%`, width: `${house.w}%`, height: `${house.h}%` }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-subtle">
            House
          </span>
        </div>

        {present.map((it) => {
          const p = pinOf(it);
          const m = META[it.type];
          return (
            <div
              key={it.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
                style={{ background: m.color }}
              >
                {m.label}
              </span>
              <span className="mt-0.5 whitespace-nowrap rounded bg-white/85 px-1 text-[8px] font-medium text-ink">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>

      {distances && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <Measure label="Gen → Panel" v={distances.panel} />
          <Measure label="Gen → Gas mtr" v={distances.gas} />
          <Measure label="Gen → Elec mtr" v={distances.elec} />
        </div>
      )}
    </div>
  );
}

function Measure({ label, v }: { label: string; v?: number }) {
  return (
    <div className="rounded-lg border border-hairline py-1">
      <div className="text-[10px] uppercase tracking-wide text-subtle">{label}</div>
      <div className="font-semibold">{v != null ? `${v} ft` : "—"}</div>
    </div>
  );
}

"use client";

import type { SurveyItem } from "@/lib/types";

// Auto-positions a pin per captured item around a simple house footprint.
// Useful with zero dragging — pins place themselves on a ring by type.
const RING: Record<string, { x: number; y: number; label: string; color: string }> = {
  electric_meter: { x: 18, y: 30, label: "E", color: "#0a84ff" },
  gas_meter: { x: 82, y: 30, label: "G", color: "#ff9f0a" },
  generator: { x: 82, y: 72, label: "⚡", color: "#34c759" },
  panel: { x: 18, y: 72, label: "P", color: "#6e6e73" },
  hvac: { x: 50, y: 88, label: "H", color: "#6e6e73" },
  hazard: { x: 50, y: 12, label: "!", color: "#ff3b30" },
};

export function SiteDiagram({ items }: { items: SurveyItem[] }) {
  const present = Array.from(new Set(items.map((i) => i.type))).filter(
    (t) => RING[t]
  );
  return (
    <div className="relative aspect-square w-full rounded-xl2 border border-hairline bg-white">
      {/* house footprint */}
      <div className="absolute left-1/2 top-1/2 h-1/3 w-2/5 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-hairline" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-subtle">
        House
      </span>
      {present.map((t) => {
        const p = RING[t];
        return (
          <div
            key={t}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow"
              style={{ background: p.color }}
            >
              {p.label}
            </span>
            <span className="mt-0.5 text-[9px] text-subtle">
              {t.replace("_", " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

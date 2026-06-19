"use client";

import { useRef, useState, useCallback } from "react";
import type { SurveyItem, DiagramLayout } from "@/lib/types";

// Interactive site diagram: drag the home footprint, drag each captured item,
// and the links to the generator show the entered distances. Positions persist
// to the job (item.pin + job.diagram) — committed on release so we don't thrash
// IndexedDB while dragging.

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

type Drag =
  | { kind: "item"; id: string }
  | { kind: "house-move" }
  | { kind: "house-resize" }
  | null;

export function SiteDiagram({
  items,
  layout,
  onCommit,
}: {
  items: SurveyItem[];
  layout?: DiagramLayout;
  onCommit: (pins: Record<string, { x: number; y: number }>, house: DiagramLayout["house"]) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const present = items.filter((i) => META[i.type]);

  const initialPins: Record<string, { x: number; y: number }> = {};
  for (const it of present) {
    initialPins[it.id] = it.pin ?? DEFAULT_RING[it.type] ?? { x: 50, y: 50 };
  }

  const [pins, setPins] = useState(initialPins);
  const [house, setHouse] = useState(layout?.house ?? DEFAULT_HOUSE);
  const drag = useRef<Drag>(null);

  const toPct = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    return {
      x: clamp(((clientX - r.left) / r.width) * 100),
      y: clamp(((clientY - r.top) / r.height) * 100),
    };
  }, []);

  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const p = toPct(e.clientX, e.clientY);
    if (drag.current.kind === "item") {
      const id = drag.current.id;
      setPins((prev) => ({ ...prev, [id]: p }));
    } else if (drag.current.kind === "house-move") {
      setHouse((h) => ({ ...h, x: clamp(p.x - h.w / 2, 0, 100 - h.w), y: clamp(p.y - h.h / 2, 0, 100 - h.h) }));
    } else if (drag.current.kind === "house-resize") {
      setHouse((h) => ({ ...h, w: clamp(p.x - h.x, 8, 100 - h.x), h: clamp(p.y - h.y, 8, 100 - h.y) }));
    }
  }

  function end() {
    if (drag.current) {
      drag.current = null;
      onCommit(pins, house);
    }
  }

  const genId = present.find((i) => i.type === "generator")?.id;
  const genPos = genId ? pins[genId] : undefined;

  return (
    <div>
      <div
        ref={boardRef}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerLeave={end}
        className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl2 border border-hairline bg-white"
      >
        {/* North arrow */}
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-center text-subtle">
          <span className="text-base leading-none">↑</span>
          <span className="text-[10px] font-semibold leading-none">N</span>
        </div>
        {/* distance links from the generator */}
        {genPos && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {present
              .filter((i) => ["panel", "gas_meter", "electric_meter"].includes(i.type))
              .map((i) => {
                const p = pins[i.id];
                const dist = Number(i.values.distanceFt);
                return (
                  <g key={i.id}>
                    <line
                      x1={`${genPos.x}%`} y1={`${genPos.y}%`}
                      x2={`${p.x}%`} y2={`${p.y}%`}
                      stroke="#c7c7cc" strokeWidth={1.5} strokeDasharray="4 3"
                    />
                    {Number.isFinite(dist) && dist > 0 && (
                      <text
                        x={`${(genPos.x + p.x) / 2}%`} y={`${(genPos.y + p.y) / 2}%`}
                        fill="#6e6e73" fontSize="9" textAnchor="middle" dy="-2"
                      >
                        {dist} ft
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        )}

        {/* home footprint */}
        <div
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            drag.current = { kind: "house-move" };
          }}
          className="absolute rounded-md border-2 border-hairline bg-canvas/60"
          style={{ left: `${house.x}%`, top: `${house.y}%`, width: `${house.w}%`, height: `${house.h}%` }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-subtle">
            House
          </span>
          <span
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = { kind: "house-resize" };
            }}
            className="absolute -bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-full border border-hairline bg-white"
          />
        </div>

        {/* item pins */}
        {present.map((it) => {
          const p = pins[it.id];
          const m = META[it.type];
          return (
            <div
              key={it.id}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                drag.current = { kind: "item", id: it.id };
              }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center active:cursor-grabbing"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow"
                style={{ background: m.color }}
              >
                {m.label}
              </span>
              <span className="mt-0.5 whitespace-nowrap rounded bg-white/85 px-1 text-[9px] font-medium text-ink">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-subtle">
        Drag the house and the markers to match the lot. Distances on the links
        come from each item&apos;s captured measurement.
      </p>
    </div>
  );
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

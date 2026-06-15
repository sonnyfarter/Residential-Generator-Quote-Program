"use client";

import { create } from "zustand";
import type { BomLine, DeterministicTakeoff, AiTakeoffResponse } from "@/lib/types";

interface EngineState {
  /** Final (possibly AI-merged) priced BOM, or null if not generated yet. */
  bom: BomLine[] | null;
  deterministic: DeterministicTakeoff | null;
  ai: AiTakeoffResponse | null;
  setResult: (r: {
    bom: BomLine[];
    deterministic: DeterministicTakeoff;
    ai: AiTakeoffResponse | null;
  }) => void;
  clear: () => void;
}

// In-memory only: the takeoff is regenerated per session from persisted inputs.
export const useEngineState = create<EngineState>((set) => ({
  bom: null,
  deterministic: null,
  ai: null,
  setResult: (r) => set({ bom: r.bom, deterministic: r.deterministic, ai: r.ai }),
  clear: () => set({ bom: null, deterministic: null, ai: null }),
}));

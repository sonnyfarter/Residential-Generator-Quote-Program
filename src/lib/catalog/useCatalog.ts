"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { GeneratorModel } from "@/lib/types";
import { GENERAC_CATALOG } from "./generac";
import { LocalStore } from "@/lib/store/LocalStore";

const store = new LocalStore();

interface CatalogState {
  catalog: GeneratorModel[];
  loaded: boolean;
  load: () => Promise<void>;
}

// Loads the user's imported catalog from IndexedDB, falling back to the built-in
// seed when none has been imported. One source of truth for every screen.
export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: GENERAC_CATALOG,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const imported = await store.getCatalog();
      set({
        catalog: imported.length ? imported : GENERAC_CATALOG,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));

export function useCatalog() {
  const { catalog, load } = useCatalogStore();
  useEffect(() => {
    load();
  }, [load]);
  const findModel = (model: string | undefined) =>
    model ? catalog.find((g) => g.model === model) : undefined;
  return { catalog, findModel };
}

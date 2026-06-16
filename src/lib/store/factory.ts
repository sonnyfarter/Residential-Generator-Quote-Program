import type { Job } from "@/lib/types";
import { PRICING_DEFAULTS } from "@/lib/pricing/defaults";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function newJob(): Job {
  const now = new Date().toISOString();
  return {
    id: uid("job"),
    createdAt: now,
    updatedAt: now,
    customer: {
      name: "",
      address: "",
      phone: "",
      email: "",
      date: now.slice(0, 10),
      rep: "",
    },
    house: {
      serviceAmps: 200,
      fuel: "ng",
      distGenPanelFt: 45,
      distGenGasFt: 60,
      distGenElecMeterFt: 35,
      existingGasBtu: 0,
      gasSupplyInWc: 7,
    },
    gasAppliances: [],
    items: [],
    selectedModel: undefined,
    pricing: { ...PRICING_DEFAULTS },
    ai: null,
  };
}

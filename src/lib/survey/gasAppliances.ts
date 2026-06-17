import type { ApplianceFuel } from "@/lib/types";

// Typical residential gas-appliance nameplate inputs (BTU/hr). These are
// *typical* worst-case values for fast field entry — always confirm against the
// appliance's nameplate. They are starting points, not verified facts.
export interface GasAppliancePreset {
  key: string;
  label: string;
  /** Typical nameplate input, BTU/hr. */
  btu: number;
  /** Whether this appliance is usually gas or electric (user can override). */
  defaultFuel: ApplianceFuel;
}

export const GAS_APPLIANCE_PRESETS: GasAppliancePreset[] = [
  { key: "furnace", label: "Furnace", btu: 100000, defaultFuel: "gas" },
  { key: "boiler", label: "Boiler", btu: 100000, defaultFuel: "gas" },
  { key: "wh_tank", label: "Water heater (tank)", btu: 40000, defaultFuel: "gas" },
  { key: "wh_tankless", label: "Tankless water heater", btu: 199000, defaultFuel: "gas" },
  { key: "range", label: "Range / cooktop", btu: 65000, defaultFuel: "gas" },
  { key: "dryer", label: "Clothes dryer", btu: 22000, defaultFuel: "gas" },
  { key: "fireplace", label: "Fireplace / gas logs", btu: 30000, defaultFuel: "gas" },
  { key: "pool", label: "Pool / spa heater", btu: 250000, defaultFuel: "gas" },
  { key: "outdoor", label: "Outdoor kitchen / grill", btu: 60000, defaultFuel: "gas" },
  { key: "other", label: "Other", btu: 0, defaultFuel: "gas" },
];

export function presetByKey(key: string): GasAppliancePreset | undefined {
  return GAS_APPLIANCE_PRESETS.find((p) => p.key === key);
}

// A typical worst-case gas household for the meter-capacity check: the big
// simultaneous draws. Used by the "worst-case" auto-populate button.
export const WORST_CASE_GAS_KEYS = ["furnace", "wh_tankless", "range", "dryer"];

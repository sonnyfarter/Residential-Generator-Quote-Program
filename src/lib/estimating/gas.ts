import {
  HEATING_VALUE,
  NG_BLACK_IRON_0_5WC,
  NG_BLACK_IRON_VERIFIED,
} from "./tables";
import type { FuelType } from "@/lib/types";

export interface GasInput {
  fuel: FuelType;
  /** Full-load fuel consumption from the genset spec sheet (ft³/hr). */
  genFuelCfh: number | null;
  runFt: number; // longest length, meter/tank → generator
  /** Existing connected appliance load (BTU/hr) for the meter check. */
  existingBtu: number;
  /** Utility meter/regulator rated capacity (BTU/hr), if known. */
  meterCapacityBtu?: number | null;
}

export interface GasResult {
  cfh: number | null;
  pipeMaterial: string;
  pipeSizeIn: number | null;
  meterAdequate: boolean | null;
  needsVerification: boolean;
  missingInputs: string[];
  notes: string[];
}

/**
 * Gas pipe sizing — NFPA 54 longest-length method.
 *  CFH = BTU/hr ÷ heating value (NG ≈ 1000, LP ≈ 2500 BTU/ft³).
 *  Full-load fuel consumption MUST come from the spec sheet. If missing, we emit
 *  a missing_input and return null rather than inventing a value.
 */
export function sizeGas(input: GasInput): GasResult {
  const notes: string[] = [];
  const missingInputs: string[] = [];

  if (input.genFuelCfh == null) {
    missingInputs.push(
      "Generator full-load fuel consumption (CFH) — required from the spec sheet; not provided."
    );
    return {
      cfh: null,
      pipeMaterial: "black-iron",
      pipeSizeIn: null,
      meterAdequate: null,
      needsVerification: true,
      missingInputs,
      notes: ["Gas pipe size cannot be computed without spec-sheet fuel CFH."],
    };
  }

  const cfh = input.genFuelCfh;

  // Pick the smallest black-iron size whose capacity at the run length ≥ CFH.
  let pipeSizeIn: number | null = null;
  for (const row of NG_BLACK_IRON_0_5WC) {
    const cap = capacityAtLength(row.cfhByLength, input.runFt);
    if (cap != null && cap >= cfh) {
      pipeSizeIn = row.sizeIn;
      break;
    }
  }
  if (pipeSizeIn == null) {
    notes.push(
      "Required CFH exceeds the reduced sizing table at this length — size against the full NFPA 54 table."
    );
  }

  // NG meter capacity check (only meaningful for natural gas).
  let meterAdequate: boolean | null = null;
  if (input.fuel === "ng") {
    const genBtu = cfh * HEATING_VALUE.ng;
    const combined = input.existingBtu + genBtu;
    if (input.meterCapacityBtu != null) {
      meterAdequate = combined <= input.meterCapacityBtu;
      if (!meterAdequate) {
        notes.push(
          `Combined load ${combined.toLocaleString()} BTU/hr may exceed meter capacity ${input.meterCapacityBtu.toLocaleString()} BTU/hr — coordinate utility upsize.`
        );
      }
    } else {
      meterAdequate = null;
      missingInputs.push(
        "Utility meter/regulator rated capacity (BTU/hr) — needed to confirm the meter is not overloaded."
      );
    }
  }

  return {
    cfh,
    pipeMaterial: "black-iron",
    pipeSizeIn,
    meterAdequate,
    // Sizing table is a reduced subset → always flag for verification.
    needsVerification: NG_BLACK_IRON_VERIFIED === false || pipeSizeIn == null,
    missingInputs,
    notes,
  };
}

function capacityAtLength(
  rows: { len: number; cfh: number }[],
  runFt: number
): number | null {
  // Use the first bucket whose length ≥ runFt (longest-length method rounds up).
  for (const r of rows) {
    if (runFt <= r.len) return r.cfh;
  }
  return rows.length ? rows[rows.length - 1].cfh : null;
}

"use client";

import { useEffect } from "react";
import { useJob } from "@/lib/store/useJob";
import { uid } from "@/lib/store/factory";
import {
  GAS_APPLIANCE_PRESETS,
  presetByKey,
  WORST_CASE_GAS_KEYS,
} from "@/lib/survey/gasAppliances";
import type { GasAppliance } from "@/lib/types";
import { Screen, Card, Field, inputCls, PrimaryButton, num } from "@/components/ui";

export default function GasPage() {
  const { job, loading, init, update } = useJob();
  useEffect(() => {
    init();
  }, [init]);

  if (loading || !job) {
    return (
      <Screen title="Gas">
        <Card>Loading…</Card>
      </Screen>
    );
  }

  // Only gas-fueled appliances contribute to the meter load.
  const gasLoad = job.gasAppliances
    .filter((a) => a.fuel === "gas")
    .reduce((s, a) => s + (a.btu || 0), 0);

  function persistLoad(items: GasAppliance[]) {
    const load = items.filter((a) => a.fuel === "gas").reduce((s, a) => s + (a.btu || 0), 0);
    update((j) => {
      j.gasAppliances = items;
      j.house.existingGasBtu = load;
    });
  }

  function addPreset(key: string) {
    const p = presetByKey(key);
    if (!p) return;
    const next: GasAppliance = {
      id: uid("ap"),
      name: p.label,
      type: p.key,
      btu: p.btu,
      fuel: p.defaultFuel,
    };
    persistLoad([...job!.gasAppliances, next]);
  }

  function loadWorstCase() {
    const items: GasAppliance[] = WORST_CASE_GAS_KEYS.map((k) => {
      const p = presetByKey(k)!;
      return { id: uid("ap"), name: p.label, type: p.key, btu: p.btu, fuel: "gas" as const };
    });
    persistLoad(items);
  }

  function patch(idx: number, change: Partial<GasAppliance>) {
    const items = job!.gasAppliances.map((a, i) => (i === idx ? { ...a, ...change } : a));
    persistLoad(items);
  }

  function remove(idx: number) {
    persistLoad(job!.gasAppliances.filter((_, i) => i !== idx));
  }

  return (
    <Screen title="Gas" subtitle="Gas appliance load for the meter check">
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            className={`${inputCls} flex-1`}
            value=""
            onChange={(e) => {
              if (e.target.value) addPreset(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">＋ Add appliance…</option>
            {GAS_APPLIANCE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
                {p.btu ? ` · ${p.btu.toLocaleString()} BTU` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={loadWorstCase}
            className="rounded-xl border border-hairline bg-white px-3 text-xs font-medium"
          >
            Worst-case
          </button>
        </div>
        <p className="text-[11px] text-warn">
          Preset BTU values are typical nameplate figures — confirm against each
          appliance tag. Set a unit to <strong>Electric</strong> and it drops out
          of the gas load.
        </p>
      </Card>

      <div className="mt-3 space-y-2">
        {job.gasAppliances.length === 0 && (
          <p className="px-1 text-sm text-subtle">
            No appliances yet. Add the existing gas loads (or tap Worst-case) so
            the NG meter-capacity check is accurate.
          </p>
        )}
        {job.gasAppliances.map((a, idx) => (
          <Card key={a.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={a.name}
                onChange={(e) => patch(idx, { name: e.target.value })}
              />
              <button className="px-1 text-bad" onClick={() => remove(idx)} aria-label="remove">
                ×
              </button>
            </div>
            <div className="grid grid-cols-[1fr,auto] items-end gap-2">
              <Field label="BTU/hr (nameplate)">
                <input
                  className={inputCls}
                  type="number"
                  inputMode="numeric"
                  value={a.btu || ""}
                  onChange={(e) => patch(idx, { btu: num(e.target.value) })}
                />
              </Field>
              <div className="flex overflow-hidden rounded-xl border border-hairline">
                {(["gas", "electric"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => patch(idx, { fuel: f })}
                    className={`px-3 py-2.5 text-xs font-medium capitalize ${
                      a.fuel === f ? "bg-accent text-white" : "bg-white text-subtle"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-3 flex items-center justify-between">
        <span className="text-sm text-subtle">Connected gas load</span>
        <span className="text-lg font-semibold">{gasLoad.toLocaleString()} BTU/hr</span>
      </Card>

      <p className="mt-3 text-xs text-subtle">
        Generator full-load fuel consumption comes from the unit spec sheet and is
        never assumed. If the catalog lacks it, the takeoff flags it as a missing
        input rather than guessing.
      </p>

      <div className="mt-6">
        <PrimaryButton href="/quote">Continue to Quote</PrimaryButton>
      </div>
    </Screen>
  );
}

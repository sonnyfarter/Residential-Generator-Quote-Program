"use client";

import { useEffect } from "react";
import { useJob } from "@/lib/store/useJob";
import { uid } from "@/lib/store/factory";
import { Screen, Card, Field, inputCls, PrimaryButton } from "@/components/ui";

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

  const totalBtu = job.gasAppliances.reduce((s, a) => s + (a.btu || 0), 0);

  return (
    <Screen title="Gas" subtitle="Appliance load for the meter check">
      <Card className="space-y-3">
        <p className="text-xs text-subtle">
          Existing connected appliances. The generator load is added to this for
          the NG meter-capacity check.
        </p>
        {job.gasAppliances.map((a, idx) => (
          <div key={a.id} className="grid grid-cols-[1fr,auto,auto] items-end gap-2">
            <Field label="Appliance">
              <input
                className={inputCls}
                value={a.name}
                placeholder="water heater, range…"
                onChange={(e) =>
                  update((j) => (j.gasAppliances[idx].name = e.target.value))
                }
              />
            </Field>
            <Field label="BTU/hr">
              <input
                className={`${inputCls} w-28`}
                type="number"
                inputMode="numeric"
                value={a.btu || ""}
                onChange={(e) =>
                  update((j) => (j.gasAppliances[idx].btu = Number(e.target.value)))
                }
              />
            </Field>
            <button
              className="pb-2.5 text-bad"
              onClick={() =>
                update((j) => j.gasAppliances.splice(idx, 1))
              }
              aria-label="remove appliance"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            update((j) =>
              j.gasAppliances.push({ id: uid("ap"), name: "", btu: 0 })
            )
          }
          className="w-full rounded-xl2 border border-dashed border-hairline py-3 text-sm text-subtle"
        >
          ＋ Add appliance
        </button>
        <div className="flex items-center justify-between border-t border-hairline pt-3 text-sm">
          <span className="text-subtle">Existing connected load</span>
          <span className="font-semibold">{totalBtu.toLocaleString()} BTU/hr</span>
        </div>
      </Card>

      <p className="mt-3 text-xs text-subtle">
        Generator full-load fuel consumption comes from the unit spec sheet and is
        never assumed. If the catalog lacks it, the takeoff will flag it as a
        missing input rather than guessing.
      </p>

      <div className="mt-6">
        <PrimaryButton
          href="/quote"
          onClick={() => update((j) => (j.house.existingGasBtu = totalBtu))}
        >
          Continue to Quote
        </PrimaryButton>
      </div>
    </Screen>
  );
}

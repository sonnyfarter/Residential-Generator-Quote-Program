"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useJob } from "@/lib/store/useJob";
import { Screen, Card, Field, inputCls, PrimaryButton, num } from "@/components/ui";

export default function SetupPage() {
  const { job, loading, init, update, reset } = useJob();
  useEffect(() => {
    init();
  }, [init]);

  if (loading || !job) {
    return (
      <Screen title="Setup">
        <Card>Loading…</Card>
      </Screen>
    );
  }

  const c = job.customer;
  const h = job.house;

  return (
    <Screen title="Setup" subtitle="Customer & service basics">
      <Card className="space-y-4">
        <Field label="Customer name">
          <input
            className={inputCls}
            value={c.name}
            onChange={(e) => update((j) => (j.customer.name = e.target.value))}
          />
        </Field>
        <Field label="Address">
          <input
            className={inputCls}
            value={c.address}
            onChange={(e) => update((j) => (j.customer.address = e.target.value))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              className={inputCls}
              inputMode="tel"
              value={c.phone}
              onChange={(e) => update((j) => (j.customer.phone = e.target.value))}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              inputMode="email"
              value={c.email}
              onChange={(e) => update((j) => (j.customer.email = e.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              className={inputCls}
              type="date"
              value={c.date}
              onChange={(e) => update((j) => (j.customer.date = e.target.value))}
            />
          </Field>
          <Field label="Rep">
            <input
              className={inputCls}
              value={c.rep}
              onChange={(e) => update((j) => (j.customer.rep = e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <h2 className="mb-2 mt-6 text-sm font-medium text-subtle">House & service</h2>
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service size" unit="A">
            <select
              className={inputCls}
              value={h.serviceAmps}
              onChange={(e) =>
                update((j) => (j.house.serviceAmps = num(e.target.value) as 100 | 200 | 400))
              }
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={400}>400</option>
            </select>
          </Field>
          <Field label="Fuel">
            <select
              className={inputCls}
              value={h.fuel}
              onChange={(e) =>
                update((j) => (j.house.fuel = e.target.value as "ng" | "lp"))
              }
            >
              <option value="ng">Natural gas</option>
              <option value="lp">Propane (LP)</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-subtle">
          Distances from the generator. These auto-fill from the Survey captures;
          adjust here if needed.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="→ Panel" unit="ft">
            <input
              className={inputCls}
              type="number"
              inputMode="decimal"
              value={h.distGenPanelFt}
              onChange={(e) =>
                update((j) => (j.house.distGenPanelFt = num(e.target.value)))
              }
            />
          </Field>
          <Field label="→ Elec mtr" unit="ft">
            <input
              className={inputCls}
              type="number"
              inputMode="decimal"
              value={h.distGenElecMeterFt}
              onChange={(e) =>
                update((j) => (j.house.distGenElecMeterFt = num(e.target.value)))
              }
            />
          </Field>
          <Field label="→ Gas mtr" unit="ft">
            <input
              className={inputCls}
              type="number"
              inputMode="decimal"
              value={h.distGenGasFt}
              onChange={(e) =>
                update((j) => (j.house.distGenGasFt = num(e.target.value)))
              }
            />
          </Field>
        </div>
        <Field label="Gas supply pressure" unit="in w.c.">
          <input
            className={inputCls}
            type="number"
            inputMode="decimal"
            value={h.gasSupplyInWc}
            onChange={(e) =>
              update((j) => (j.house.gasSupplyInWc = num(e.target.value)))
            }
          />
        </Field>
      </Card>

      <div className="mt-6 space-y-2">
        <PrimaryButton href="/gas">Continue to Gas</PrimaryButton>
        <Link
          href="/jobs"
          className="block w-full rounded-2xl border border-hairline bg-white py-3 text-center text-sm font-medium"
        >
          Jobs / switch customer
        </Link>
        <Link
          href="/pricebook"
          className="block w-full rounded-2xl border border-hairline bg-white py-3 text-center text-sm font-medium"
        >
          Manage price book
        </Link>
        <Link
          href="/catalog"
          className="block w-full rounded-2xl border border-hairline bg-white py-3 text-center text-sm font-medium"
        >
          Generator catalog
        </Link>
        <Link
          href="/settings"
          className="block w-full rounded-2xl border border-hairline bg-white py-3 text-center text-sm font-medium"
        >
          Company profile & logo
        </Link>
        <button
          onClick={async () => {
            if (confirm("Start a new job? Current job stays saved.")) {
              await reset();
            }
          }}
          className="block w-full py-2 text-center text-sm text-subtle"
        >
          Start new job
        </button>
      </div>
    </Screen>
  );
}

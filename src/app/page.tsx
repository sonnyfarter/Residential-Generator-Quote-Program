"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { SURVEY_ITEMS, itemConfig, type SurveyItemConfig } from "@/lib/survey/items";
import { uid } from "@/lib/store/factory";
import type { SurveyItem, HouseInfo } from "@/lib/types";
import { Screen, Card, StatusDot, PrimaryButton } from "@/components/ui";
import { ItemEditor } from "@/components/ItemEditor";
import { SiteDiagram } from "@/components/SiteDiagram";

export default function SurveyPage() {
  const { job, loading, init, update } = useJob();
  const [editing, setEditing] = useState<{ config: SurveyItemConfig; item: SurveyItem } | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (loading || !job) {
    return (
      <Screen title="Survey">
        <Card>Loading…</Card>
      </Screen>
    );
  }

  const required = SURVEY_ITEMS.filter((i) => i.required);
  const optional = SURVEY_ITEMS.filter((i) => !i.required);

  function itemsOfType(type: string): SurveyItem[] {
    return job!.items.filter((i) => i.type === type);
  }

  function openNew(config: SurveyItemConfig) {
    const existing = config.multiple ? undefined : itemsOfType(config.key)[0];
    const item: SurveyItem =
      existing ?? {
        id: uid("itm"),
        type: config.key,
        status: "missing",
        values: {},
        photoIds: [],
      };
    setEditing({ config, item });
  }

  async function saveItem(updated: SurveyItem) {
    await update((j) => {
      const idx = j.items.findIndex((i) => i.id === updated.id);
      if (idx === -1) j.items.push(updated);
      else j.items[idx] = updated;
      // Mirror key required fields into house info so the rest of the app works.
      syncHouse(j.house, j.items);
    });
  }

  const requiredComplete = required.every(
    (c) => itemsOfType(c.key)[0]?.status === "complete"
  );

  return (
    <Screen title="Survey" subtitle="Capture the site. Three required.">
      <div className="space-y-3">
        {required.map((c) => {
          const it = itemsOfType(c.key)[0];
          const status = it?.status ?? "missing";
          return (
            <button
              key={c.key}
              onClick={() => openNew(c)}
              className="block w-full text-left"
            >
              <Card className="flex items-center gap-3 active:opacity-70">
                <StatusDot status={status} />
                <div className="flex-1">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-subtle">{c.subtitle}</div>
                </div>
                <span className="text-subtle">›</span>
              </Card>
            </button>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-medium text-subtle">Add as needed</h2>
      <div className="space-y-3">
        {optional.map((c) => {
          const items = itemsOfType(c.key);
          return (
            <div key={c.key}>
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setEditing({ config: c, item: it })}
                  className="mb-2 block w-full text-left"
                >
                  <Card className="flex items-center gap-3 active:opacity-70">
                    <StatusDot status={it.status} />
                    <div className="flex-1">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-subtle">
                        {it.photoIds.length} photo(s)
                      </div>
                    </div>
                    <span className="text-subtle">›</span>
                  </Card>
                </button>
              ))}
              <button
                onClick={() => openNew(c)}
                className="w-full rounded-xl2 border border-dashed border-hairline py-3 text-sm text-subtle active:opacity-70"
              >
                ＋ Add {c.title}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowDiagram((v) => !v)}
        className="mt-6 flex w-full items-center justify-between rounded-xl2 border border-hairline bg-white px-4 py-3 text-sm"
      >
        <span className="font-medium">Site diagram</span>
        <span className="text-subtle">{showDiagram ? "Hide" : "Show"}</span>
      </button>
      {showDiagram && (
        <div className="mt-3">
          <SiteDiagram
            items={job.items}
            layout={job.diagram}
            onCommit={(pins, houseRect) =>
              update((j) => {
                for (const it of j.items) {
                  if (pins[it.id]) it.pin = pins[it.id];
                }
                j.diagram = { house: houseRect };
              })
            }
          />
        </div>
      )}

      <div className="mt-6">
        <PrimaryButton href="/setup" disabled={!requiredComplete}>
          {requiredComplete ? "Continue to Setup" : "Complete the required captures"}
        </PrimaryButton>
      </div>

      {editing && (
        <ItemEditor
          config={editing.config}
          item={editing.item}
          jobId={job.id}
          onSave={saveItem}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}

// Mirror required survey fields into house info.
function syncHouse(house: HouseInfo, items: SurveyItem[]) {
  const gas = items.find((i) => i.type === "gas_meter");
  const elec = items.find((i) => i.type === "electric_meter");
  const panel = items.find((i) => i.type === "panel");
  if (gas) {
    if (gas.values.fuel === "ng" || gas.values.fuel === "lp")
      house.fuel = gas.values.fuel;
    if (typeof gas.values.distanceFt === "number")
      house.distGenGasFt = gas.values.distanceFt;
  }
  if (elec) {
    const amps = Number(elec.values.serviceAmps);
    if (amps === 100 || amps === 200 || amps === 400) house.serviceAmps = amps;
    if (typeof elec.values.distanceFt === "number")
      house.distGenElecMeterFt = elec.values.distanceFt;
  }
  if (panel && typeof panel.values.distanceFt === "number")
    house.distGenPanelFt = panel.values.distanceFt;
}

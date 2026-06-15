"use client";

import { useState } from "react";
import type { SurveyItemConfig } from "@/lib/survey/items";
import type { SurveyItem } from "@/lib/types";
import { Field, inputCls, PrimaryButton } from "@/components/ui";
import { PhotoStrip } from "@/components/PhotoStrip";

export function ItemEditor({
  config,
  item,
  jobId,
  onSave,
  onClose,
}: {
  config: SurveyItemConfig;
  item: SurveyItem;
  jobId: string;
  onSave: (item: SurveyItem) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState(item.values);
  const [photoIds, setPhotoIds] = useState(item.photoIds);

  function computeStatus(): SurveyItem["status"] {
    const required = config.fields.filter((f) => f.required);
    const filled = required.filter((f) => {
      const v = values[f.key];
      return v !== undefined && v !== "" && v !== null;
    });
    if (required.length > 0 && filled.length === required.length) return "complete";
    if (filled.length > 0 || photoIds.length > 0 || Object.keys(values).length)
      return "partial";
    return "missing";
  }

  function save() {
    onSave({ ...item, values, photoIds, status: computeStatus() });
    onClose();
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end bg-black/30">
      <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas p-5 pb-8">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline" />
        <h2 className="text-xl font-semibold">{config.title}</h2>
        <p className="mb-4 text-sm text-subtle">{config.subtitle}</p>

        <div className="space-y-4">
          {config.fields.map((f) => (
            <Field key={f.key} label={f.label} unit={f.unit}>
              {f.type === "select" ? (
                <select
                  className={inputCls}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                >
                  <option value="">Select…</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "toggle" ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[f.key])}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.checked })
                  }
                  className="h-6 w-6"
                />
              ) : (
                <input
                  className={inputCls}
                  type={f.type === "number" ? "number" : "text"}
                  inputMode={f.type === "number" ? "decimal" : "text"}
                  placeholder={f.placeholder}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [f.key]:
                        f.type === "number"
                          ? e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              )}
            </Field>
          ))}

          <div>
            <span className="mb-2 block text-xs font-medium text-subtle">
              Photos
            </span>
            <PhotoStrip jobId={jobId} photoIds={photoIds} onChange={setPhotoIds} />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <PrimaryButton onClick={save}>Save</PrimaryButton>
          <button
            onClick={onClose}
            className="w-full py-2 text-center text-sm text-subtle"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

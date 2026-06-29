"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useJob } from "@/lib/store/useJob";
import type { Job } from "@/lib/types";
import { Screen, Card, PrimaryButton, StatusDot } from "@/components/ui";

export default function JobsPage() {
  const { job, store, init, loadJob, reset } = useJob();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);

  const refresh = useCallback(async () => {
    setJobs(await store.listJobs());
  }, [store]);

  useEffect(() => {
    init().then(refresh);
  }, [init, refresh]);

  async function open(id: string) {
    await loadJob(id);
    router.push("/");
  }
  async function remove(id: string) {
    if (!confirm("Delete this job and its photos? This cannot be undone.")) return;
    await store.deleteJob(id);
    await refresh();
  }
  async function startNew() {
    await reset();
    router.push("/");
  }

  function reqComplete(j: Job): boolean {
    const need = ["generator", "gas_meter", "electric_meter", "panel"];
    return need.every((t) => j.items.find((i) => i.type === t)?.status === "complete");
  }

  return (
    <Screen title="Jobs" subtitle="Your saved surveys & quotes">
      <div className="mb-4">
        <PrimaryButton onClick={startNew}>+ Start new job</PrimaryButton>
      </div>

      {jobs.length === 0 && (
        <p className="text-sm text-subtle">No jobs yet.</p>
      )}

      <div className="space-y-2">
        {jobs.map((j) => (
          <Card key={j.id} className="flex items-center gap-3">
            <StatusDot status={reqComplete(j) ? "complete" : j.items.length ? "partial" : "missing"} />
            <button onClick={() => open(j.id)} className="flex-1 text-left">
              <div className="font-medium">
                {j.customer.name || "Untitled job"}
                {j.id === job?.id && <span className="ml-2 text-[10px] text-accent">• active</span>}
              </div>
              <div className="text-xs text-subtle">
                {[j.customer.address, j.selectedModel, j.customer.date].filter(Boolean).join(" · ") || "No details yet"}
              </div>
            </button>
            <button onClick={() => remove(j.id)} className="px-2 text-bad" aria-label="delete job">
              ✕
            </button>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

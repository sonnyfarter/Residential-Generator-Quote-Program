"use client";

import { create } from "zustand";
import type { Job } from "@/lib/types";
import { LocalStore } from "./LocalStore";
import type { JobStore } from "./JobStore";
import { newJob } from "./factory";

// Single LocalStore instance behind the JobStore interface.
const store: JobStore = new LocalStore();

interface JobState {
  job: Job | null;
  loading: boolean;
  store: JobStore;
  /** Load the most recent job, or create one if none exists. */
  init: () => Promise<void>;
  /** Apply a partial mutation and persist. */
  update: (mutate: (job: Job) => void) => Promise<void>;
  /** Start a fresh job. */
  reset: () => Promise<void>;
}

export const useJob = create<JobState>((set, get) => ({
  job: null,
  loading: true,
  store,
  init: async () => {
    set({ loading: true });
    const jobs = await store.listJobs();
    let job = jobs[0];
    if (!job) {
      job = newJob();
      await store.saveJob(job);
    }
    set({ job, loading: false });
  },
  update: async (mutate) => {
    const current = get().job;
    if (!current) return;
    const next: Job = structuredCloneJob(current);
    mutate(next);
    await store.saveJob(next);
    set({ job: next });
  },
  reset: async () => {
    const job = newJob();
    await store.saveJob(job);
    set({ job });
  },
}));

// structuredClone can't clone Blobs cycles safely here; jobs hold no Blobs
// (photos live in their own table), so a shallow-deep clone via JSON is fine.
function structuredCloneJob(job: Job): Job {
  return JSON.parse(JSON.stringify(job)) as Job;
}

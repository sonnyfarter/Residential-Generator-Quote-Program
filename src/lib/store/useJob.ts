"use client";

import { create } from "zustand";
import type { Job } from "@/lib/types";
import { LocalStore } from "./LocalStore";
import type { JobStore } from "./JobStore";
import { newJob } from "./factory";

// Single LocalStore instance behind the JobStore interface.
const store: JobStore = new LocalStore();

// Dedupe concurrent first-run init() calls (avoids creating duplicate jobs).
let initPromise: Promise<void> | null = null;

interface JobState {
  job: Job | null;
  loading: boolean;
  store: JobStore;
  /** Load the most recent job, or create one if none exists (idempotent). */
  init: () => Promise<void>;
  /** Apply a partial mutation and persist. */
  update: (mutate: (job: Job) => void) => Promise<void>;
  /** Start a fresh job (the previous one stays saved and reachable in /jobs). */
  reset: () => Promise<void>;
  /** Switch the active job by id. */
  loadJob: (id: string) => Promise<void>;
}

export const useJob = create<JobState>((set, get) => ({
  job: null,
  loading: true,
  store,
  init: async () => {
    // Already loaded → don't re-read the DB (would clobber in-flight edits).
    if (get().job) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const jobs = await store.listJobs();
      let job = jobs[0];
      if (!job) {
        job = newJob();
        await store.saveJob(job);
      }
      set({ job, loading: false });
      // Best-effort cleanup of photo blobs no longer referenced by any job.
      store.gcPhotos().catch(() => {});
    })();
    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
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
  loadJob: async (id) => {
    const job = await store.getJob(id);
    if (job) set({ job });
  },
}));

// Jobs hold no Blobs (photos/logo live in their own tables), so a JSON deep
// clone is safe and avoids structuredClone's Blob-cloning surprises.
function structuredCloneJob(job: Job): Job {
  return JSON.parse(JSON.stringify(job)) as Job;
}

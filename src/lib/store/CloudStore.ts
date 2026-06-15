import type { JobStore } from "./JobStore";
import type { Job, PriceBookItem, Photo } from "@/lib/types";

// Stub for a later phase (cloud sync). Intentionally not wired in. It exists so
// the persistence seam is real today and adopting cloud is a swap, not a rewrite.
export class CloudStore implements JobStore {
  private notImplemented(): never {
    throw new Error("CloudStore is a later-phase stub — not implemented yet.");
  }
  async listJobs(): Promise<Job[]> { return this.notImplemented(); }
  async getJob(): Promise<Job | undefined> { return this.notImplemented(); }
  async saveJob(): Promise<void> { return this.notImplemented(); }
  async deleteJob(): Promise<void> { return this.notImplemented(); }
  async addPhoto(): Promise<void> { return this.notImplemented(); }
  async getPhoto(): Promise<Photo | undefined> { return this.notImplemented(); }
  async getJobPhotos(): Promise<Photo[]> { return this.notImplemented(); }
  async deletePhoto(): Promise<void> { return this.notImplemented(); }
  async getPriceBook(): Promise<PriceBookItem[]> { return this.notImplemented(); }
  async replacePriceBook(): Promise<void> { return this.notImplemented(); }
  async upsertPriceItems(): Promise<void> { return this.notImplemented(); }
}

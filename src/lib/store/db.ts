import Dexie, { type Table } from "dexie";
import type { Job, PriceBookItem, Photo, CompanyProfile } from "@/lib/types";

// Photos are stored as their own records (blobs survive app close) and linked to
// jobs by id, so a job record stays light and photos load on demand.
export interface PhotoRecord extends Photo {
  jobId: string;
}

export class StandbyDb extends Dexie {
  jobs!: Table<Job, string>;
  photos!: Table<PhotoRecord, string>;
  priceBook!: Table<PriceBookItem, string>;
  company!: Table<CompanyProfile, string>;

  constructor() {
    super("standby-takeoff");
    this.version(1).stores({
      jobs: "id, updatedAt",
      photos: "id, jobId",
      priceBook: "id, category, costSource",
    });
    // v2 adds the company profile (logo + contact) for branded reports.
    this.version(2).stores({
      jobs: "id, updatedAt",
      photos: "id, jobId",
      priceBook: "id, category, costSource",
      company: "id",
    });
  }
}

let _db: StandbyDb | null = null;

/** Lazily construct the DB (only in the browser). */
export function db(): StandbyDb {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!_db) _db = new StandbyDb();
  return _db;
}

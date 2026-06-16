import type { Job, PriceBookItem, Photo, CompanyProfile } from "@/lib/types";

// Persistence abstraction. LocalStore (IndexedDB) now; CloudStore stub later.
// All UI talks to this interface, so swapping in cloud sync is a wiring change.
export interface JobStore {
  // jobs
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  saveJob(job: Job): Promise<void>;
  deleteJob(id: string): Promise<void>;

  // photos (blobs persist across app close)
  addPhoto(jobId: string, photo: Photo): Promise<void>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getJobPhotos(jobId: string): Promise<Photo[]>;
  deletePhoto(id: string): Promise<void>;

  // price book
  getPriceBook(): Promise<PriceBookItem[]>;
  replacePriceBook(items: PriceBookItem[]): Promise<void>;
  upsertPriceItems(items: PriceBookItem[]): Promise<void>;

  // company profile (branding for reports)
  getCompany(): Promise<CompanyProfile | undefined>;
  saveCompany(company: CompanyProfile): Promise<void>;
}

import type { JobStore } from "./JobStore";
import { db } from "./db";
import type { Job, PriceBookItem, Photo, CompanyProfile, GeneratorModel } from "@/lib/types";
import { SEED_PRICE_BOOK } from "@/lib/priceBook/seed";

export class LocalStore implements JobStore {
  async listJobs(): Promise<Job[]> {
    const jobs = await db().jobs.orderBy("updatedAt").reverse().toArray();
    return jobs;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return db().jobs.get(id);
  }

  async saveJob(job: Job): Promise<void> {
    job.updatedAt = new Date().toISOString();
    await db().jobs.put(job);
  }

  async deleteJob(id: string): Promise<void> {
    await db().transaction("rw", db().jobs, db().photos, async () => {
      await db().jobs.delete(id);
      await db().photos.where("jobId").equals(id).delete();
    });
  }

  async addPhoto(jobId: string, photo: Photo): Promise<void> {
    await db().photos.put({ ...photo, jobId });
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    return db().photos.get(id);
  }

  async getJobPhotos(jobId: string): Promise<Photo[]> {
    return db().photos.where("jobId").equals(jobId).toArray();
  }

  async deletePhoto(id: string): Promise<void> {
    await db().photos.delete(id);
  }

  async gcPhotos(): Promise<number> {
    const [jobs, photoIds] = await Promise.all([
      db().jobs.toArray(),
      db().photos.toCollection().primaryKeys(),
    ]);
    const referenced = new Set<string>();
    for (const j of jobs) for (const it of j.items) for (const pid of it.photoIds) referenced.add(pid);
    const orphans = (photoIds as string[]).filter((id) => !referenced.has(id));
    if (orphans.length) await db().photos.bulkDelete(orphans);
    return orphans.length;
  }

  async getPriceBook(): Promise<PriceBookItem[]> {
    const count = await db().priceBook.count();
    if (count === 0) {
      // seed on first use
      await db().priceBook.bulkPut(SEED_PRICE_BOOK);
      return [...SEED_PRICE_BOOK];
    }
    return db().priceBook.toArray();
  }

  async replacePriceBook(items: PriceBookItem[]): Promise<void> {
    await db().transaction("rw", db().priceBook, async () => {
      await db().priceBook.clear();
      await db().priceBook.bulkPut(items);
    });
  }

  async upsertPriceItems(items: PriceBookItem[]): Promise<void> {
    await db().priceBook.bulkPut(items);
  }

  async getCompany(): Promise<CompanyProfile | undefined> {
    return db().company.get("company");
  }

  async saveCompany(company: CompanyProfile): Promise<void> {
    await db().company.put({ ...company, id: "company" });
  }

  async getCatalog(): Promise<GeneratorModel[]> {
    return db().catalog.toArray();
  }

  async replaceCatalog(models: GeneratorModel[]): Promise<void> {
    await db().transaction("rw", db().catalog, async () => {
      await db().catalog.clear();
      await db().catalog.bulkPut(models);
    });
  }
}

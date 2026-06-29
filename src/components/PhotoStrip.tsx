"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import { uid } from "@/lib/store/factory";
import type { Photo } from "@/lib/types";

// Captures photos to IndexedDB as blobs (survive app close) and renders them via
// object URLs. The strip owns the item's photoIds list through onChange.
export function PhotoStrip({
  jobId,
  photoIds,
  onChange,
}: {
  jobId: string;
  photoIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const store = useJob((s) => s.store);
  const [urls, setUrls] = useState<{ id: string; url: string }[]>([]);

  useEffect(() => {
    let revoked: string[] = [];
    (async () => {
      const out: { id: string; url: string }[] = [];
      for (const id of photoIds) {
        const p = await store.getPhoto(id);
        if (p) {
          const url = URL.createObjectURL(p.blob);
          revoked.push(url);
          out.push({ id, url });
        }
      }
      setUrls(out);
    })();
    return () => revoked.forEach((u) => URL.revokeObjectURL(u));
  }, [photoIds, store]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: string[] = [];
    for (const f of files) {
      const photo: Photo = {
        id: uid("ph"),
        blob: f,
        createdAt: new Date().toISOString(),
      };
      await store.addPhoto(jobId, photo);
      added.push(photo.id);
    }
    if (added.length) onChange([...photoIds, ...added]);
    e.target.value = "";
  }

  function remove(id: string) {
    // List-only: the blob is left in place so a Cancel doesn't lose a saved
    // photo. Unreferenced blobs are garbage-collected on next app load.
    onChange(photoIds.filter((p) => p !== id));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u) => (
        <div key={u.id} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={u.url}
            alt="site"
            className="print-photo h-20 w-20 rounded-xl object-cover"
          />
          <button
            onClick={() => remove(u.id)}
            className="no-print absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bad text-xs text-white"
            aria-label="remove photo"
          >
            ×
          </button>
        </div>
      ))}
      {/* Take a new photo with the camera */}
      <label className="no-print flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline text-subtle active:opacity-70">
        <span className="text-xl leading-none">📷</span>
        <span className="text-[10px]">Take</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </label>
      {/* Upload existing photos from the library / files */}
      <label className="no-print flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline text-subtle active:opacity-70">
        <span className="text-xl leading-none">🖼</span>
        <span className="text-[10px]">Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </label>
    </div>
  );
}

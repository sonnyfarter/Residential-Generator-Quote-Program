"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";

export function ReportPhotos({ jobId }: { jobId: string }) {
  const store = useJob((s) => s.store);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let revoked: string[] = [];
    (async () => {
      const photos = await store.getJobPhotos(jobId);
      const out = photos.map((p) => {
        const u = URL.createObjectURL(p.blob);
        revoked.push(u);
        return u;
      });
      setUrls(out);
    })();
    return () => revoked.forEach((u) => URL.revokeObjectURL(u));
  }, [jobId, store]);

  if (urls.length === 0)
    return <p className="text-xs text-subtle">No photos captured.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={u}
          alt="site"
          className="print-photo h-24 w-24 rounded-lg object-cover"
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useJob } from "@/lib/store/useJob";
import type { CompanyProfile } from "@/lib/types";
import { Screen, Card, Field, inputCls, PrimaryButton } from "@/components/ui";

const EMPTY: CompanyProfile = {
  id: "company",
  name: "",
  phone: "",
  email: "",
  license: "",
  pmEmail: "",
  logo: null,
};

export default function SettingsPage() {
  const store = useJob((s) => s.store);
  const init = useJob((s) => s.init);
  const [company, setCompany] = useState<CompanyProfile>(EMPTY);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    store.getCompany().then((c) => {
      if (c) setCompany({ ...EMPTY, ...c });
    });
  }, [store]);
  useEffect(() => {
    if (company.logo) {
      const u = URL.createObjectURL(company.logo);
      setLogoUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setLogoUrl(null);
  }, [company.logo]);

  function set<K extends keyof CompanyProfile>(key: K, val: CompanyProfile[K]) {
    setCompany((c) => ({ ...c, [key]: val }));
    setSaved(false);
  }

  async function save() {
    await store.saveCompany(company);
    setSaved(true);
  }

  return (
    <Screen title="Settings" subtitle="Company profile for branded reports">
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-canvas">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[10px] text-subtle">No logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-xl border border-hairline bg-white px-3 py-2 text-sm">
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) set("logo", f);
                }}
              />
            </label>
            {company.logo && (
              <button onClick={() => set("logo", null)} className="text-xs text-bad">
                Remove
              </button>
            )}
          </div>
        </div>

        <Field label="Company name">
          <input className={inputCls} value={company.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input className={inputCls} value={company.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Company email">
            <input className={inputCls} inputMode="email" value={company.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="License #">
          <input className={inputCls} value={company.license} onChange={(e) => set("license", e.target.value)} />
        </Field>
        <Field label="Project manager email">
          <input
            className={inputCls}
            inputMode="email"
            placeholder="pm@yourcompany.com"
            value={company.pmEmail}
            onChange={(e) => set("pmEmail", e.target.value)}
          />
        </Field>
      </Card>

      <div className="mt-6">
        <PrimaryButton onClick={save}>{saved ? "Saved ✓" : "Save company profile"}</PrimaryButton>
      </div>
    </Screen>
  );
}

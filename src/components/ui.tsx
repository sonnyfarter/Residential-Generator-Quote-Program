"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="pb-4 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>}
      </header>
      {children}
    </main>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`print-card rounded-xl2 border border-hairline bg-white p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  href,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls = `block w-full rounded-2xl px-5 py-3.5 text-center text-base font-semibold transition ${
    disabled
      ? "bg-hairline text-subtle"
      : "bg-accent text-white active:opacity-80"
  }`;
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-subtle">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-base outline-none focus:border-accent";

export function StatusDot({ status }: { status: "missing" | "partial" | "complete" }) {
  const color =
    status === "complete" ? "bg-ok" : status === "partial" ? "bg-warn" : "bg-bad";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export function EstimateBadge({ date }: { date?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">
      Estimate — replace with your Graybar pricing{date ? ` · ${date}` : ""}
    </span>
  );
}

export function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function money2(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

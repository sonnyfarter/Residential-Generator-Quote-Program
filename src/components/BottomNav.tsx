"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Survey", icon: "◎" },
  { href: "/setup", label: "Setup", icon: "☰" },
  { href: "/gas", label: "Gas", icon: "◐" },
  { href: "/quote", label: "Quote", icon: "$" },
  { href: "/takeoff", label: "Takeoff", icon: "✦" },
  { href: "/reports", label: "Reports", icon: "▤" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-accent" : "text-subtle"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

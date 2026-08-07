"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

export function AppTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const homeHref = tabs[0]?.href;

  return (
    <div className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 py-3">
        {tabs.map((t) => {
          const active = t.href === homeHref ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "border border-rule text-ink-soft hover:border-accent hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

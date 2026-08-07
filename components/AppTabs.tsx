"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

export function AppTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const homeHref = tabs[0]?.href;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl gap-4 overflow-x-auto px-4">
        {tabs.map((t) => {
          const active = t.href === homeHref ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`border-b-2 px-1 py-3 text-sm font-medium ${
                active
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
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

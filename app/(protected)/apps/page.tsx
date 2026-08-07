import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { APPS } from "@/lib/apps";
import { BanknoteIcon, BellIcon, TrendingUpIcon } from "@/components/icons";

const ICONS: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  expenses: BanknoteIcon,
  reminders: BellIcon,
  stocks: TrendingUpIcon,
};

export default async function AppsPage() {
  const session = await auth();

  return (
    <>
      <TopBar userName={session?.user?.name} userImage={session?.user?.image} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Your Apps</h1>
        <p className="mb-8 text-sm text-ink-soft">Pick a tracker to open.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {APPS.map((app) => {
            const Icon = ICONS[app.slug];
            return (
              <Link
                key={app.slug}
                href={app.href}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-rule bg-surface px-4 py-7 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105"
                  style={{ backgroundColor: app.soft }}
                >
                  <Icon className="h-7 w-7" style={{ color: app.color }} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{app.name}</p>
                  <p className="mt-1 text-xs leading-snug text-ink-soft">{app.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}

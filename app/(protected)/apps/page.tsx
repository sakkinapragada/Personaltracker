import Link from "next/link";
import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { APPS } from "@/lib/apps";

export default async function AppsPage() {
  const session = await auth();

  return (
    <>
      <TopBar userName={session?.user?.name} userImage={session?.user?.image} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Your Apps</h1>
        <p className="mb-6 text-sm text-ink-soft">Pick a tracker to open.</p>
        <div className="flex flex-col gap-2.5">
          {APPS.map((app) => (
            <Link
              key={app.slug}
              href={app.href}
              className="flex items-center gap-4 rounded-r-2xl rounded-l-full px-4 py-3.5 transition hover:brightness-95"
              style={{ backgroundColor: app.soft }}
            >
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-display text-base font-bold text-white"
                style={{ backgroundColor: app.color }}
              >
                {app.mark}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-ink">{app.name}</p>
                <p className="text-xs text-ink-soft">{app.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

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
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Your Apps</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {APPS.map((app) => (
            <Link
              key={app.slug}
              href={app.href}
              className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                style={{ backgroundColor: `${app.color}1A` }}
              >
                {app.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{app.name}</p>
                <p className="text-xs text-gray-500">{app.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

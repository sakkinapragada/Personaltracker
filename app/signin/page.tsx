import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";
import { BanknoteIcon, BellIcon, NewsIcon, NoteIcon, TrendingUpIcon } from "@/components/icons";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/apps");

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper"
      style={{
        backgroundImage: "radial-gradient(rgba(27,30,34,0.06) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-teal opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-accent opacity-15 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-rule bg-surface p-8 text-center shadow-md">
        <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Personal Tracker</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Expenses, reminders, investments, notes, and news — all in one place.
        </p>
        <form action={signInAction}>
          <button
            type="submit"
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Sign in with Google
          </button>
        </form>
        <div className="mt-7 flex items-center justify-center gap-4 border-t border-rule pt-6">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "#ece8f5" }}
            >
              <BanknoteIcon className="h-4.5 w-4.5" style={{ color: "#5e4b96" }} />
            </span>
            <span className="text-[11px] text-ink-soft">Expenses</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "#e2f3ec" }}
            >
              <BellIcon className="h-4.5 w-4.5" style={{ color: "#1f8a63" }} />
            </span>
            <span className="text-[11px] text-ink-soft">Reminders</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "#e5eef7" }}
            >
              <TrendingUpIcon className="h-4.5 w-4.5" style={{ color: "#256ca8" }} />
            </span>
            <span className="text-[11px] text-ink-soft">Stocks</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f6ecdb" }}
            >
              <NoteIcon className="h-4.5 w-4.5" style={{ color: "#a3701a" }} />
            </span>
            <span className="text-[11px] text-ink-soft">Notes</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f7e6dd" }}
            >
              <NewsIcon className="h-4.5 w-4.5" style={{ color: "#b5502e" }} />
            </span>
            <span className="text-[11px] text-ink-soft">News</span>
          </div>
        </div>
      </div>
    </div>
  );
}

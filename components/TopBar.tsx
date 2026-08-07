import Link from "next/link";
import { signOutAction } from "@/app/actions";

export function TopBar({
  userName,
  userImage,
  appName,
}: {
  userName?: string | null;
  userImage?: string | null;
  appName?: string;
}) {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/apps" className="font-display text-base font-extrabold text-ink">
            Personal Tracker
          </Link>
          {appName && (
            <>
              <span className="text-sm text-ink-soft">/</span>
              <span className="text-sm font-semibold text-accent">{appName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName ?? ""}
              className="h-8 w-8 rounded-full ring-2 ring-accent-soft"
            />
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper hover:text-ink"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

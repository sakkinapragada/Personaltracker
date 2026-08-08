import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { ChevronLeftIcon, LogOutIcon, SettingsIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <header className="sticky top-0 z-20 border-b border-rule bg-surface/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {appName ? (
            <Link href="/apps" className="flex min-w-0 items-center gap-1.5 sm:hidden">
              <ChevronLeftIcon className="h-4 w-4 flex-shrink-0 text-ink-soft" />
              <span className="truncate font-display text-base font-extrabold text-ink">
                {appName}
              </span>
            </Link>
          ) : (
            <Link href="/apps" className="font-display text-base font-extrabold text-ink sm:hidden">
              Personal Tracker
            </Link>
          )}

          <Link href="/apps" className="hidden font-display text-base font-extrabold text-ink sm:inline">
            Personal Tracker
          </Link>
          {appName && (
            <span className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-ink-soft">/</span>
              <span className="text-sm font-semibold text-accent">{appName}</span>
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink sm:h-auto sm:w-auto sm:rounded-none sm:px-0 sm:text-sm sm:hover:bg-transparent"
          >
            <SettingsIcon className="h-4.5 w-4.5 sm:hidden" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

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
              aria-label="Log out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink sm:h-auto sm:w-auto sm:rounded-full sm:px-3 sm:py-1.5 sm:text-sm"
            >
              <LogOutIcon className="h-4.5 w-4.5 sm:hidden" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

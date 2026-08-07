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
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/apps" className="text-sm font-semibold text-emerald-600">
            Personal Tracker
          </Link>
          {appName && (
            <>
              <span className="text-sm text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-700">{appName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName ?? ""} className="h-8 w-8 rounded-full" />
          )}
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-800">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

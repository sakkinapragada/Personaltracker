import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/apps");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-full max-w-sm rounded-xl border border-rule bg-surface p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-ink">Personal Tracker</h1>
        <p className="mb-6 text-sm text-ink-soft">Sign in to access your apps.</p>
        <form action={signInAction}>
          <button
            type="submit"
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}

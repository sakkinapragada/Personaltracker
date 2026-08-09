import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div data-app="games">
      <TopBar userName={session?.user?.name} userImage={session?.user?.image} appName="Games" />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

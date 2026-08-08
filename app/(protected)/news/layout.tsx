import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";

export default async function NewsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div data-app="news">
      <TopBar userName={session?.user?.name} userImage={session?.user?.image} appName="News" />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { AppTabs } from "@/components/AppTabs";

export default async function StocksLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <>
      <TopBar
        userName={session?.user?.name}
        userImage={session?.user?.image}
        appName="Stock Tracker"
      />
      <AppTabs
        tabs={[
          { href: "/stocks", label: "Screener" },
          { href: "/stocks/portfolio", label: "Portfolio" },
          { href: "/stocks/news", label: "News" },
          { href: "/stocks/earnings", label: "Earnings" },
          { href: "/stocks/earnings-recap", label: "Earnings Recap" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </>
  );
}

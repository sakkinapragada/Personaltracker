import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { AppTabs } from "@/components/AppTabs";

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div data-app="expenses">
      <TopBar
        userName={session?.user?.name}
        userImage={session?.user?.image}
        appName="Expense Tracker"
      />
      <AppTabs
        tabs={[
          { href: "/expenses", label: "Dashboard" },
          { href: "/expenses/trends", label: "Trends" },
          { href: "/expenses/categories", label: "Categories" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

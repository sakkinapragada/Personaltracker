import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { AppTabs } from "@/components/AppTabs";

export default async function RemindersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <>
      <TopBar
        userName={session?.user?.name}
        userImage={session?.user?.image}
        appName="Reminders"
      />
      <AppTabs
        tabs={[
          { href: "/reminders", label: "Reminders" },
          { href: "/reminders/summary", label: "Summary" },
          { href: "/reminders/categories", label: "Categories" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </>
  );
}

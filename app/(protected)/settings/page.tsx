import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredName: true, monthlyBudget: true, newsCountry: true },
  });

  const defaultName = user?.preferredName || session.user.name?.split(" ")[0] || "";

  return (
    <>
      <TopBar userName={session.user.name} userImage={session.user.image} appName="Settings" />
      <main className="flex min-h-[80vh] items-center justify-center px-4 py-10">
        <SettingsForm
          defaultName={defaultName}
          defaultBudget={user?.monthlyBudget ?? null}
          defaultCountry={user?.newsCountry ?? null}
        />
      </main>
    </>
  );
}

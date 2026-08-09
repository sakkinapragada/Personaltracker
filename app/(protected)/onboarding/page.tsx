import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/OnboardingForm";
import { decryptNullableNumber } from "@/lib/crypto";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredName: true, monthlyBudget: true, newsCountry: true, onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/apps");

  const defaultName = user?.preferredName || session.user.name?.split(" ")[0] || "";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <OnboardingForm
        defaultName={defaultName}
        defaultBudget={decryptNullableNumber(user?.monthlyBudget ?? null)}
        defaultCountry={user?.newsCountry ?? null}
      />
    </div>
  );
}

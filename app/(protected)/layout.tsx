import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

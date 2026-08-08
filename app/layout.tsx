import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Tracker",
  description: "Personal tracking apps — expenses, and more to come",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { theme: true } })
    : null;

  return (
    <html lang="en" className="h-full antialiased" data-theme={user?.theme ?? undefined}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

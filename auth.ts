import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

function getAllowedEmails(): string[] {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Safety net: always honor OWNER_EMAIL too, so a misconfigured or missing
  // ALLOWED_EMAILS in one environment can never lock out the original owner.
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && !list.includes(owner)) list.push(owner);

  return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || !getAllowedEmails().includes(email)) return false;

      const user = await prisma.user.upsert({
        where: { email },
        update: { name: profile?.name, image: profile?.picture as string | undefined },
        create: {
          email,
          name: profile?.name,
          image: profile?.picture as string | undefined,
        },
      });

      const categoryCount = await prisma.category.count({ where: { userId: user.id } });
      if (categoryCount === 0) {
        await prisma.category.createMany({
          data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id, isDefault: true })),
        });
      }

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const user = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (user) token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

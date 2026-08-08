import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

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
      const ownerEmail = process.env.OWNER_EMAIL;
      if (!ownerEmail || profile?.email !== ownerEmail) return false;

      const user = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: { name: profile?.name, image: profile?.picture as string | undefined },
        create: {
          email: ownerEmail,
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
        const user = await prisma.user.findUnique({ where: { email: token.email } });
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

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const googleEnabled =
  typeof process.env.AUTH_GOOGLE_ID === "string" &&
  process.env.AUTH_GOOGLE_ID.length > 0 &&
  typeof process.env.AUTH_GOOGLE_SECRET === "string" &&
  process.env.AUTH_GOOGLE_SECRET.length > 0;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [GitHub, ...(googleEnabled ? [Google] : [])],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

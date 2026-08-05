import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          username: user.username,
          image: user.avatarUrl ?? undefined,
          isAdmin: (user as any).isAdmin ?? false,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      // Client called useSession().update() after an account/profile
      // change -- re-read the latest name/avatar from the database since
      // the token otherwise only carries what was true at sign-in.
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.name = fresh.displayName;
          token.picture = fresh.avatarUrl ?? undefined;
          token.isAdmin = (fresh as any).isAdmin ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

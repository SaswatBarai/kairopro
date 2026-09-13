import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { LoginInputSchema } from "@kairopro/contracts";
import {
  createPersonalOrg,
  db,
  getPrimaryOrgForUser,
  verifyPassword,
} from "@kairopro/core";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginInputSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const password = parsed.data.password;
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        let org = await getPrimaryOrgForUser(user.id);
        if (!org) {
          org = await createPersonalOrg(user.id, user.name);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          orgId: org.id,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const email = user.email.toLowerCase().trim();

        let dbUser = await db.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0] ?? "User",
              image: user.image,
            },
          });
        }

        let org = await getPrimaryOrgForUser(dbUser.id);
        if (!org) {
          org = await createPersonalOrg(dbUser.id, dbUser.name);
        }

        user.id = dbUser.id;
        user.orgId = org.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.orgId = user.orgId;
      }

      if (!token.orgId && token.id) {
        const org = await getPrimaryOrgForUser(token.id);
        if (org) token.orgId = org.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.orgId = token.orgId ?? "";
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ??
    "kairopro-default-dev-secret-do-not-use-in-prod",
};

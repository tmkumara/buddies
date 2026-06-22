import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user.id),
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      // Allow client-side session update (e.g., after password change)
      if (trigger === "update" && typeof session?.mustChangePassword === "boolean") {
        token.mustChangePassword = session.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        id: token.id,
        username: token.username,
        role: token.role,
        mustChangePassword: token.mustChangePassword,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

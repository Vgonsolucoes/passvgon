import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: Date | null;
    passwordHash: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  unstable_update: update
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 hours
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const passwordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!passwordValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date()
          }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          passwordHash: user.passwordHash
        };
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.APP_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.APP_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.APP_ENV === "production"
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.emailVerified =
          (token.emailVerified as Date | null) ?? null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async signIn({ user }) {
      if (!user) return false;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true }
      });
      if (!dbUser) return false;
      return dbUser.status === "ACTIVE";
    }
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (!user.id) return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = isNewUser;
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SIGN_IN",
          entityType: "user",
          entityId: user.id
        }
      });
    },
    async signOut(data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = data as any;
      const userId = ctx?.token?.id ?? ctx?.session?.userId;
      if (!userId) return;
      await prisma.auditLog.create({
        data: {
          userId: String(userId),
          action: "SIGN_OUT",
          entityType: "user",
          entityId: String(userId)
        }
      });
    }
  }
});

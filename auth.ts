import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      emailVerified: Date | null;
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
      twoFactorRequired: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: Date | null;
    passwordHash: string | null;
    passwordAlgo: string | null;
    twoFactorEnabled: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
    emailVerified: Date | null;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
    twoFactorRequired: boolean;
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

        const { valid, shouldUpgrade } = await verifyPassword(
          password,
          user.passwordHash,
          (user.passwordAlgo ?? "bcrypt") as "argon2id" | "bcrypt"
        );
        if (!valid) return null;

        // Upgrade transparente bcrypt → argon2id no próximo login válido
        if (shouldUpgrade) {
          try {
            const { hash, algo } = await hashPassword(password);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hash, passwordAlgo: algo }
            });
            user.passwordHash = hash;
            user.passwordAlgo = algo;
          } catch {
            // ignora: não deve quebrar o login se o upgrade falhar
          }
        }

        const now = new Date();
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: now }
          });
        } catch {
          // ignore
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          passwordHash: user.passwordHash,
          passwordAlgo: user.passwordAlgo,
          twoFactorEnabled: user.twoFactorEnabled
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
        token = { ...token, ...(session as object) } as typeof token;
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified;
        token.twoFactorEnabled = !!user.twoFactorEnabled;
        // Quando usuário tem 2FA habilitado, sessão entra estado PROVISÓRIO
        // até desafio TOTP válido (rota /2fa).
        token.twoFactorRequired = !!user.twoFactorEnabled;
        token.twoFactorVerified = !user.twoFactorEnabled;
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
        session.user.twoFactorEnabled = !!token.twoFactorEnabled;
        session.user.twoFactorVerified = !!token.twoFactorVerified;
        session.user.twoFactorRequired = !!token.twoFactorRequired;
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
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "AUTH_SIGN_IN",
            entityType: "user",
            entityId: user.id,
            result: "SUCCESS"
          }
        });
      } catch {
        // ignore
      }
    },
    async signOut(data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = data as any;
      const userId = ctx?.token?.id ?? ctx?.session?.userId;
      if (!userId) return;
      try {
        await prisma.auditLog.create({
          data: {
            userId: String(userId),
            action: "AUTH_SIGN_OUT",
            entityType: "user",
            entityId: String(userId),
            result: "SUCCESS"
          }
        });
      } catch {
        // ignore
      }
    }
  }
});

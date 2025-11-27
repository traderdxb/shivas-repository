import { compare } from 'bcrypt-ts';
import NextAuth, { type Session, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';

import { authConfig } from './auth.config';
import { getUser, getUserById, upsertOAuthUser } from '@/lib/db/queries';

type ExtendedUser = User & {
  id: string;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
};

type ExtendedToken = JWT & {
  id?: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
};

interface ExtendedSession extends Session {
  user: ExtendedUser;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize(
        credentials: Partial<Record<'email' | 'password', string>> | undefined,
      ) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const users = await getUser(email);

        if (users.length === 0 || !users[0].password) {
          return null;
        }

        const passwordsMatch = await compare(password, users[0].password);

        if (!passwordsMatch) {
          return null;
        }

        return users[0] as ExtendedUser;
      },
    }),
    Google,
    GitHub,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== 'credentials') {
        if (!user?.email) {
          return false;
        }

        const dbUser = await upsertOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });

        Object.assign(user, dbUser);
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const nextToken = token as ExtendedToken;

      if (user) {
        const extendedUser = user as ExtendedUser;
        nextToken.id = extendedUser.id;
        nextToken.email = extendedUser.email ?? nextToken.email ?? null;
        nextToken.name = extendedUser.name ?? nextToken.name ?? null;
        nextToken.picture = extendedUser.image ?? nextToken.picture ?? null;
        const isMfaEnabled = Boolean(extendedUser.mfaEnabled);
        nextToken.mfaEnabled = isMfaEnabled;
        nextToken.mfaVerified = isMfaEnabled ? false : true;
      }

      if (trigger === 'update' && session?.user) {
        if (typeof session.user.mfaEnabled !== 'undefined') {
          nextToken.mfaEnabled = session.user.mfaEnabled;
        }
        if (typeof session.user.mfaVerified !== 'undefined') {
          nextToken.mfaVerified = session.user.mfaVerified;
        }
      }

      if (!nextToken.email && nextToken.id) {
        const dbUser = await getUserById(nextToken.id);
        if (dbUser) {
          nextToken.email = dbUser.email;
          nextToken.name = dbUser.name;
          nextToken.picture = dbUser.image;
          nextToken.mfaEnabled = dbUser.mfaEnabled ?? false;
          if (!dbUser.mfaEnabled) {
            nextToken.mfaVerified = true;
          }
        }
      }

      if (typeof nextToken.mfaVerified === 'undefined') {
        nextToken.mfaVerified = !nextToken.mfaEnabled;
      }

      return nextToken;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: ExtendedToken;
    }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        session.user.name = token.name ?? session.user.email;
        session.user.image = token.picture ?? session.user.image;
        (session.user as any).mfaEnabled = token.mfaEnabled ?? false;
        (session.user as any).mfaVerified = token.mfaVerified ?? false;
      }

      return session;
    },
  },
});

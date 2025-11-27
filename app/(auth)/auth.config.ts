import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isOnRegister = pathname.startsWith('/register');
      const isOnLogin = pathname.startsWith('/login');
      const isOnMfaVerify = pathname.startsWith('/mfa/verify');
      const isOnMfaSetup = pathname.startsWith('/mfa/setup');
      const isAuthApiRoute = pathname.startsWith('/api/auth');
      const requiresMfa =
        isLoggedIn && auth?.user && (auth.user as any).mfaEnabled;
      const hasVerifiedMfa = Boolean(
        isLoggedIn && auth?.user && (auth.user as any).mfaVerified,
      );

      if (isAuthApiRoute) {
        return true;
      }

      if (!isLoggedIn && !(isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (requiresMfa && !hasVerifiedMfa && !isOnMfaVerify) {
        return Response.redirect(new URL('/mfa/verify', nextUrl));
      }

      if ((!requiresMfa || hasVerifiedMfa) && isOnMfaVerify) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (!isLoggedIn && isOnMfaSetup) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

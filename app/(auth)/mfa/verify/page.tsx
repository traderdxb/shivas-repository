import { redirect } from 'next/navigation';

import { MfaCodeForm } from '@/components/mfa-code-form';

import { auth } from '../../auth';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const requiresChallenge = Boolean(
    (session.user as any).mfaEnabled && !(session.user as any).mfaVerified,
  );

  if (!requiresChallenge) {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card p-8 text-center shadow-lg">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Verify your identity</h1>
          <p className="text-sm text-muted-foreground">
            Enter the verification code from your authenticator app to continue.
          </p>
        </div>
        <MfaCodeForm
          intent="login"
          submitLabel="Verify & continue"
          successMessage="Verification complete"
          redirectTo="/"
        />
      </div>
    </div>
  );
}

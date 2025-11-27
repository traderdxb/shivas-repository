import type { User } from 'next-auth';
import { redirect } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import { auth } from '../../auth';
import { enableMfa, type EnableMfaResult } from '../../actions';
import { DisableMfaButton } from '@/components/mfa-disable-button';
import { MfaCodeForm } from '@/components/mfa-code-form';

function RecoveryCodes({ codes }: { codes: Array<string> | undefined }) {
  if (!codes?.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Backup recovery codes
      </h3>
      <p className="text-sm text-muted-foreground">
        Store these codes in a safe place. Each code can be used once if you
        lose access to your authenticator app.
      </p>
      <div className="rounded-xl border bg-muted/40 p-4">
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((code) => (
            <li key={code} className="rounded-lg bg-background px-3 py-2">
              {code}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SetupSection({ data }: { data: EnableMfaResult | null }) {
  if (!data || data.status === 'error') {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        Unable to start MFA setup. Please try again later.
      </div>
    );
  }

  if (data.status === 'already_enabled') {
    return (
      <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground">
        Multi-factor authentication is already enabled for your account.
      </div>
    );
  }

  const secret = data.secret ?? '';
  const qrValue = data.otpauthUrl ?? secret;

  if (!secret) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        We couldn&apos;t generate a secret key. Please refresh the page to try again.
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card/60 p-6 text-center">
        <QRCodeSVG value={qrValue} size={200} />
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Secret key</p>
          <code className="font-mono text-base break-all px-3 py-1 rounded-md bg-muted">
            {secret}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          Scan the QR code with Google Authenticator, 1Password, or any TOTP
          compatible app. If you can&apos;t scan, enter the secret key manually.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <RecoveryCodes codes={data.recoveryCodes} />
        <div className="space-y-3 rounded-2xl border bg-card/60 p-6">
          <h3 className="text-base font-semibold">Confirm your setup</h3>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app to enable MFA.
          </p>
          <MfaCodeForm
            intent="setup"
            submitLabel="Confirm MFA setup"
            successMessage="Multi-factor authentication enabled"
          />
        </div>
      </div>
    </div>
  );
}

function EnabledSection() {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card/60 p-6 text-center">
      <h3 className="text-lg font-semibold">Multi-factor authentication is active</h3>
      <p className="text-sm text-muted-foreground">
        You&apos;ll be asked for a verification code whenever you sign in.
      </p>
      <div className="flex justify-center">
        <DisableMfaButton />
      </div>
    </div>
  );
}

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const currentUser = session.user as User & { mfaEnabled?: boolean };
  const hasMfaEnabled = Boolean(currentUser.mfaEnabled);
  const setupData = hasMfaEnabled ? null : await enableMfa();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-4xl space-y-10 rounded-3xl border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Secure your account</h1>
          <p className="text-sm text-muted-foreground">
            Add a second layer of protection by enabling time-based one-time
            passcodes.
          </p>
        </div>
        {hasMfaEnabled ? <EnabledSection /> : <SetupSection data={setupData} />}
      </div>
    </div>
  );
}

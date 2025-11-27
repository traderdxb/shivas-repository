'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import {
  verifyMfaChallenge,
  type VerifyMfaActionState,
} from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? 'Verifying...' : label}
    </Button>
  );
}

export function MfaCodeForm({
  intent,
  submitLabel = 'Verify code',
  successMessage,
  redirectTo,
}: {
  intent: 'setup' | 'login';
  submitLabel?: string;
  successMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<VerifyMfaActionState, FormData>(
    verifyMfaChallenge,
    {
      status: 'idle',
      intent,
    },
  );

  useEffect(() => {
    if (state.status === 'success') {
      toast.success(successMessage ?? 'Verification complete');
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } else if (state.status === 'invalid_code') {
      toast.error('Invalid verification code');
    } else if (state.status === 'error') {
      toast.error('Unable to verify code');
    }
  }, [state.status, redirectTo, router, successMessage]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={intent} />
      <div className="flex flex-col gap-2">
        <label
          htmlFor="mfa-code"
          className="text-sm font-medium text-muted-foreground"
        >
          One-time passcode
        </label>
        <Input
          id="mfa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          pattern="[0-9]*"
          maxLength={6}
          required
        />
      </div>
      <SubmitButton label={submitLabel} />
    </form>
  );
}

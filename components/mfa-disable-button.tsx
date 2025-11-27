'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { disableMfa } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

export function DisableMfaButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDisable = () => {
    startTransition(async () => {
      const result = await disableMfa();
      if (result.status === 'success') {
        toast.success('Multi-factor authentication disabled');
      } else {
        toast.error('Unable to disable MFA');
      }
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleDisable}
    >
      {isPending ? 'Disabling…' : 'Disable MFA'}
    </Button>
  );
}

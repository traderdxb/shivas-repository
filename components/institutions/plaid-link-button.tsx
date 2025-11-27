'use client';

import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

import { Button } from '@/components/ui/button';

interface PlaidLinkButtonProps {
  onLinked?: () => Promise<void> | void;
}

export function PlaidLinkButton({ onLinked }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const config = {
    token: linkToken,
    onSuccess: async (publicToken: string, metadata: { institution: { name?: string | null } | null }) => {
      try {
        const response = await fetch('/api/integrations/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange Plaid token');
        }

        await onLinked?.();
      } catch (error) {
        console.error('Failed to finish Plaid link', error);
      } finally {
        setIsLaunching(false);
        setLinkToken(null);
      }
    },
    onExit: () => {
      setIsLaunching(false);
      setLinkToken(null);
    },
  } as const;

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready && isLaunching) {
      open();
    }
  }, [linkToken, ready, isLaunching, open]);

  async function requestLinkToken() {
    setIsLaunching(true);
    try {
      const response = await fetch('/api/integrations/plaid/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: ['transactions', 'investments'] }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize Plaid link token');
      }

      const data = await response.json();
      const token = data.linkToken ?? data.link_token ?? null;
      if (!token) {
        throw new Error('Missing link token in response');
      }
      setLinkToken(token);
    } catch (error) {
      console.error('Failed to load Plaid link token', error);
      setIsLaunching(false);
    }
  }

  return (
    <Button onClick={requestLinkToken} disabled={isLaunching} variant="outline">
      {isLaunching ? 'Opening Plaid…' : 'Link institution'}
    </Button>
  );
}

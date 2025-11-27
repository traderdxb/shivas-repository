'use client';

import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTransition, type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

const OAUTH_REDIRECT_TO = '/';

function GoogleIcon(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12.24 9.818v4.364h6.028c-.264 1.572-1.813 4.61-6.028 4.61a6.919 6.919 0 1 1 0-13.838 6.31 6.31 0 0 1 4.457 1.719l3.034-2.926A10.84 10.84 0 0 0 12.24 1.5 10.74 10.74 0 1 0 23 12.24a11.7 11.7 0 0 0-.188-2.422z"
        fill="currentColor"
      />
    </svg>
  );
}

export function OAuthButtonGroup() {
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [isGithubPending, startGithubTransition] = useTransition();

  const handleOAuth = (provider: 'google' | 'github') => {
    if (provider === 'google') {
      startGoogleTransition(() => {
        void signIn(provider, { redirectTo: OAUTH_REDIRECT_TO });
      });
      return;
    }

    startGithubTransition(() => {
      void signIn(provider, { redirectTo: OAUTH_REDIRECT_TO });
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={() => handleOAuth('google')}
        disabled={isGooglePending}
      >
        {isGooglePending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        Continue with Google
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={() => handleOAuth('github')}
        disabled={isGithubPending}
      >
        {isGithubPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 .5C5.648.5.5 5.648.5 12c0 5.087 3.292 9.395 7.868 10.918.576.108.788-.252.788-.56 0-.276-.012-1.187-.012-2.155-2.876.528-3.63-.7-3.86-1.344-.132-.336-.708-1.368-1.212-1.644-.414-.216-1.008-.744-.012-.756.936-.012 1.608.864 1.836 1.224 1.068 1.8 2.772 1.296 3.456.984.108-.768.414-1.296.756-1.596-2.548-.288-5.22-1.284-5.22-5.7 0-1.26.444-2.292 1.176-3.096-.12-.288-.516-1.476.12-3.072 0 0 .96-.3 3.144 1.188.912-.252 1.884-.384 2.856-.384s1.944.132 2.856.384c2.184-1.5 3.144-1.188 3.144-1.188.636 1.596.24 2.784.12 3.072.732.804 1.176 1.836 1.176 3.096 0 4.428-2.684 5.412-5.244 5.7.42.36.804 1.044.804 2.124 0 1.536-.012 2.772-.012 3.156 0 .312.212.684.8.56C20.216 21.403 23.5 17.087 23.5 12c0-6.352-5.148-11.5-11.5-11.5Z"
            />
          </svg>
        )}
        Continue with GitHub
      </Button>
    </div>
  );
}

'use server';

import { z } from 'zod';

import {
  createUser,
  disableUserMfa,
  enableUserMfa,
  getUser,
  getUserById,
  setUserMfaSecret,
} from '@/lib/db/queries';
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  mintMfaSecret,
  verifyMfaToken,
} from '@/lib/auth/mfa';

import { auth, signIn, updateSession } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface EnableMfaResult {
  status: 'success' | 'already_enabled' | 'error';
  secret?: string;
  otpauthUrl?: string;
  recoveryCodes?: Array<string>;
}

export const enableMfa = async (): Promise<EnableMfaResult> => {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return { status: 'error' };
  }

  const dbUser = await getUserById(session.user.id);

  if (!dbUser) {
    return { status: 'error' };
  }

  if (dbUser.mfaEnabled) {
    return { status: 'already_enabled' };
  }

  let secret = dbUser.mfaSecretHash ?? null;
  let otpauthUrl = secret
    ? buildOtpAuthUri(dbUser.email, secret)
    : null;

  if (!secret) {
    const minted = mintMfaSecret(dbUser.email);
    secret = minted.secret;
    otpauthUrl = minted.otpauthUrl;
    await setUserMfaSecret({ userId: dbUser.id, secretHash: secret });
  }

  if (!secret) {
    return { status: 'error' };
  }

  return {
    status: 'success',
    secret,
    otpauthUrl: otpauthUrl ?? buildOtpAuthUri(dbUser.email, secret),
    recoveryCodes: generateRecoveryCodes(),
  };
};

const verifyMfaSchema = z.object({
  code: z.string().min(6).max(6),
  intent: z.enum(['setup', 'login']),
});

export interface VerifyMfaActionState {
  status: 'idle' | 'success' | 'invalid_code' | 'error';
  intent: 'setup' | 'login';
}

export const verifyMfaChallenge = async (
  _: VerifyMfaActionState,
  formData: FormData,
): Promise<VerifyMfaActionState> => {
  const intent = (formData.get('intent') as 'setup' | 'login') ?? 'login';

  try {
    const validated = verifyMfaSchema.parse({
      code: formData.get('code'),
      intent: formData.get('intent') ?? intent,
    });

    const session = await auth();

    if (!session?.user?.id) {
      return { status: 'error', intent: validated.intent };
    }

    const dbUser = await getUserById(session.user.id);

    if (!dbUser?.mfaSecretHash) {
      return { status: 'error', intent: validated.intent };
    }

    const isValid = verifyMfaToken({
      secret: dbUser.mfaSecretHash,
      token: validated.code,
    });

    if (!isValid) {
      return { status: 'invalid_code', intent: validated.intent };
    }

    if (validated.intent === 'setup') {
      await enableUserMfa({ userId: dbUser.id });
      await updateSession({
        user: { mfaEnabled: true, mfaVerified: true } as any,
      });
    } else {
      await updateSession({
        user: { mfaVerified: true } as any,
      });
    }

    return { status: 'success', intent: validated.intent };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_code', intent };
    }

    return { status: 'error', intent };
  }
};

export interface DisableMfaActionState {
  status: 'idle' | 'success' | 'error';
}

export const disableMfa = async (): Promise<DisableMfaActionState> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { status: 'error' };
  }

  await disableUserMfa({ userId: session.user.id });
  await updateSession({
    user: { mfaEnabled: false, mfaVerified: true } as any,
  });

  return { status: 'success' };
};

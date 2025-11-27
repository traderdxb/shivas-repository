import { createHash, randomBytes } from 'node:crypto';

import { authenticator } from 'otplib';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_ISSUER = process.env.MFA_TOTP_ISSUER ?? 'Deep Research';
const DEFAULT_WINDOW = Number(process.env.MFA_TOTP_WINDOW ?? '1');

function bufferToBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function hashSecret(secret: string) {
  const digest = createHash('sha256').update(secret).digest();
  return bufferToBase32(digest);
}

export function buildOtpAuthUri(email: string, secret: string) {
  return authenticator.keyuri(email, DEFAULT_ISSUER, secret);
}

export function mintMfaSecret(email: string) {
  const entropy = randomBytes(40).toString('hex');
  const secret = hashSecret(entropy);
  const otpauthUrl = buildOtpAuthUri(email, secret);

  return { secret, otpauthUrl };
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
}

export function verifyMfaToken({
  secret,
  token,
  window = DEFAULT_WINDOW,
}: {
  secret: string;
  token: string;
  window?: number;
}) {
  if (!secret || !token) {
    return false;
  }

  const delta = (authenticator.checkDelta as any)(token, secret, { window });
  return delta !== null;
}

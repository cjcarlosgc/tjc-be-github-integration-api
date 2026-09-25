import { createHmac, timingSafeEqual } from 'node:crypto';
import { invalidWebhookSignature } from '../github/errors.js';

export function verifyGithubWebhookSignature(rawBody: Buffer, signature: string | undefined, secret: string): void {
  const match = typeof signature === 'string' ? /^sha256=([a-f0-9]{64})$/.exec(signature) : null;
  if (!match) throw invalidWebhookSignature();

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(match[1], 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw invalidWebhookSignature();
  }
}

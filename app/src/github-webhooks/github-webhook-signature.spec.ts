import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GithubIntegrationError } from '../github/errors.js';
import { verifyGithubWebhookSignature } from './github-webhook-signature.js';

const secret = 'test-only-webhook-secret';
const body = Buffer.from('{"action":"opened"}');

function signatureFor(value: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(value).digest('hex')}`;
}

describe('GitHub webhook signature', () => {
  it('accepts a valid signature over the exact raw bytes', () => {
    expect(() => verifyGithubWebhookSignature(body, signatureFor(body), secret)).not.toThrow();
  });

  it.each([undefined, '', 'sha256=invalid', `sha256=${'0'.repeat(64)}`])('rejects invalid signature %s', (signature) => {
    expect(() => verifyGithubWebhookSignature(body, signature, secret)).toThrowError(
      expect.objectContaining({ code: 'INVALID_WEBHOOK_SIGNATURE', status: 401 }),
    );
  });

  it('rejects a body changed after signing', () => {
    expect(() => verifyGithubWebhookSignature(Buffer.from(`${body.toString()} `), signatureFor(body), secret))
      .toThrowError(GithubIntegrationError);
  });
});

import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  hasCoreServiceCredential,
  hasRequiredRuntimeConfiguration,
  validateEnvironment,
} from './runtime-config.js';

function testGithubAppEnvironment(): Record<string, string> {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
  return {
    GITHUB_APP_ID: '4935151',
    GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from(pem).toString('base64'),
  };
}

describe('runtime configuration', () => {
  it('defaults PORT without requiring remote services', () => {
    expect(validateEnvironment({})).toMatchObject({ PORT: 3000 });
  });

  it('accepts a valid local port and an internal service credential', () => {
    expect(
      validateEnvironment({
        PORT: '4100',
        CORE_TO_GITHUB_INTEGRATION_TOKEN: 'test-only-service-token',
        ...testGithubAppEnvironment(),
      }),
    ).toMatchObject({ PORT: 4100 });
  });

  it('keeps empty .env.example credentials optional so the process can start not-ready', () => {
    expect(validateEnvironment({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: '',
      GITHUB_APP_ID: '',
      GITHUB_APP_PRIVATE_KEY_BASE64: '',
    })).toMatchObject({ PORT: 3000 });
    expect(hasRequiredRuntimeConfiguration({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: '',
      GITHUB_APP_ID: '',
      GITHUB_APP_PRIVATE_KEY_BASE64: '',
    })).toBe(false);
  });

  it('rejects invalid ports without echoing the supplied value', () => {
    expect(() => validateEnvironment({ PORT: 'private-value' })).toThrow(
      'Invalid PORT configuration; expected an integer from 1 to 65535.',
    );
  });

  it('rejects malformed service credentials without echoing them', () => {
    expect(() =>
      validateEnvironment({ CORE_TO_GITHUB_INTEGRATION_TOKEN: 'bad token' }),
    ).toThrow('Invalid internal service authentication configuration.');
  });

  it('rejects incomplete or malformed GitHub App configuration without exposing key material', () => {
    expect(() => validateEnvironment({ GITHUB_APP_ID: '123' })).toThrow('Invalid GitHub App configuration.');
    expect(() => validateEnvironment({
      GITHUB_APP_ID: '123',
      GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from('not a private key').toString('base64'),
    })).toThrow('Invalid GitHub App configuration.');
  });

  it('reports missing credentials as not ready', () => {
    expect(hasCoreServiceCredential({})).toBe(false);
  });

  it('does not treat whitespace-only credentials as ready', () => {
    expect(hasCoreServiceCredential({ CORE_TO_GITHUB_INTEGRATION_TOKEN: '' })).toBe(
      false,
    );
  });

  it('requires internal service auth and valid GitHub App credentials for readiness', () => {
    expect(hasRequiredRuntimeConfiguration({})).toBe(false);
    expect(hasRequiredRuntimeConfiguration({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: 'service',
      ...testGithubAppEnvironment(),
    })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  hasCoreServiceCredential,
  hasCoreWebhookDeliveryConfiguration,
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

function testWebhookDeliveryEnvironment(): Record<string, string> {
  return {
    CORE_API_BASE_URL: 'http://127.0.0.1:3010',
    GITHUB_INTEGRATION_TO_CORE_TOKEN: 'test-only-gh-to-core-token',
    GITHUB_WEBHOOK_SECRET: 'test-only-webhook-secret',
    CONSOLE_CORS_ORIGINS: 'http://localhost:5173',
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
        ...testWebhookDeliveryEnvironment(),
        ...testGithubAppEnvironment(),
      }),
    ).toMatchObject({ PORT: 4100 });
  });

  it('keeps empty .env.example credentials optional so the process can start not-ready', () => {
    expect(validateEnvironment({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: '',
      CORE_API_BASE_URL: '',
      GITHUB_INTEGRATION_TO_CORE_TOKEN: '',
      GITHUB_WEBHOOK_SECRET: '',
      GITHUB_APP_ID: '',
      GITHUB_APP_PRIVATE_KEY_BASE64: '',
      CONSOLE_CORS_ORIGINS: '',
    })).toMatchObject({ PORT: 3000 });
    expect(hasRequiredRuntimeConfiguration({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: '',
      CORE_API_BASE_URL: '',
      GITHUB_INTEGRATION_TO_CORE_TOKEN: '',
      GITHUB_WEBHOOK_SECRET: '',
      GITHUB_APP_ID: '',
      GITHUB_APP_PRIVATE_KEY_BASE64: '',
      CONSOLE_CORS_ORIGINS: '',
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

  it('rejects invalid Core URL and outbound bearer configuration without exposing values', () => {
    expect(() => validateEnvironment({ CORE_API_BASE_URL: 'http://core.example.test' })).toThrow(
      'Invalid Core service URL configuration.',
    );
    expect(() => validateEnvironment({ CORE_API_BASE_URL: 'https://core.example.test/internal' })).toThrow(
      'Invalid Core service URL configuration.',
    );
    expect(() => validateEnvironment({ NODE_ENV: 'production', CORE_API_BASE_URL: 'http://127.0.0.1:3010' })).toThrow(
      'Invalid Core service URL configuration.',
    );
    expect(() => validateEnvironment({ GITHUB_INTEGRATION_TO_CORE_TOKEN: 'bad token' })).toThrow(
      'Invalid Core service authentication configuration.',
    );
  });

  it('allows loopback HTTP for local Core only outside production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development', CORE_API_BASE_URL: 'http://127.0.0.1:3010' })).not.toThrow();
    expect(hasCoreWebhookDeliveryConfiguration({
      NODE_ENV: 'production',
      CORE_API_BASE_URL: 'http://127.0.0.1:3010',
      GITHUB_INTEGRATION_TO_CORE_TOKEN: 'test-only-gh-to-core-token',
      GITHUB_WEBHOOK_SECRET: 'test-only-webhook-secret',
    })).toBe(false);
  });

  it('rejects incomplete or malformed GitHub App configuration without exposing key material', () => {
    expect(() => validateEnvironment({ GITHUB_APP_ID: '123' })).toThrow('Invalid GitHub App configuration.');
    expect(() => validateEnvironment({
      GITHUB_APP_ID: '123',
      GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from('not a private key').toString('base64'),
    })).toThrow('Invalid GitHub App configuration.');
  });

  it('accepts only exact HTTPS origins or loopback HTTP origins for Console CORS', () => {
    expect(validateEnvironment({ CONSOLE_CORS_ORIGINS: 'https://console.example.test,http://localhost:5173' }))
      .toMatchObject({ CONSOLE_CORS_ORIGINS: 'https://console.example.test,http://localhost:5173' });
    for (const value of ['*', 'http://console.example.test', 'https://console.example.test/path', 'https://a.test,https://a.test']) {
      expect(() => validateEnvironment({ CONSOLE_CORS_ORIGINS: value })).toThrow(
        'Invalid Console CORS origin configuration.',
      );
    }
  });

  it('rejects loopback HTTP origins for Console CORS in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production', CONSOLE_CORS_ORIGINS: 'http://localhost:5173' })).toThrow(
      'Invalid Console CORS origin configuration.',
    );
    expect(() => validateEnvironment({ NODE_ENV: 'production', CONSOLE_CORS_ORIGINS: 'https://console.example.test' })).not.toThrow();
    expect(hasRequiredRuntimeConfiguration({
      NODE_ENV: 'production',
      CORE_TO_GITHUB_INTEGRATION_TOKEN: 'test-only-core-token',
      ...testWebhookDeliveryEnvironment(),
      CORE_API_BASE_URL: 'https://core.example.test',
      CONSOLE_CORS_ORIGINS: 'http://localhost:5173',
      ...testGithubAppEnvironment(),
    })).toBe(false);
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
      ...testWebhookDeliveryEnvironment(),
      ...testGithubAppEnvironment(),
    })).toBe(true);
  });

  it('requires a webhook secret, distinct outbound service bearer, and Core URL for webhook readiness', () => {
    expect(hasCoreWebhookDeliveryConfiguration({})).toBe(false);
    expect(hasCoreWebhookDeliveryConfiguration(testWebhookDeliveryEnvironment())).toBe(true);
  });
});

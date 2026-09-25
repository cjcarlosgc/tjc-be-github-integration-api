import { createPrivateKey } from 'node:crypto';

export interface RuntimeConfig extends Record<string, unknown> {
  PORT: number;
  CORE_TO_GITHUB_INTEGRATION_TOKEN?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY_BASE64?: string;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): RuntimeConfig {
  const rawPort = environment.PORT;
  const port = rawPort === undefined ? 3000 : Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid PORT configuration; expected an integer from 1 to 65535.');
  }

  const coreToken = environment.CORE_TO_GITHUB_INTEGRATION_TOKEN;
  if (
    coreToken !== undefined &&
    typeof coreToken !== 'string'
  ) {
    throw new Error('Invalid internal service authentication configuration.');
  }

  if (typeof coreToken === 'string' && /\s/.test(coreToken)) {
    throw new Error('Invalid internal service authentication configuration.');
  }

  const appId = environment.GITHUB_APP_ID === '' ? undefined : environment.GITHUB_APP_ID;
  const privateKeyBase64 = environment.GITHUB_APP_PRIVATE_KEY_BASE64 === ''
    ? undefined
    : environment.GITHUB_APP_PRIVATE_KEY_BASE64;
  if ((appId === undefined) !== (privateKeyBase64 === undefined)) {
    throw new Error('Invalid GitHub App configuration.');
  }
  if (appId !== undefined && (typeof appId !== 'string' || !/^[1-9]\d{0,19}$/.test(appId))) {
    throw new Error('Invalid GitHub App configuration.');
  }
  if (privateKeyBase64 !== undefined) {
    if (typeof privateKeyBase64 !== 'string' || privateKeyBase64.length === 0) {
      throw new Error('Invalid GitHub App configuration.');
    }
    try {
      const pem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
      if (!pem.includes('PRIVATE KEY')) throw new Error('invalid key');
      const key = createPrivateKey(pem);
      if (key.asymmetricKeyType !== 'rsa') throw new Error('invalid key type');
    } catch {
      throw new Error('Invalid GitHub App configuration.');
    }
  }

  return {
    ...environment,
    PORT: port,
  };
}

export function hasCoreServiceCredential(
  environment: Record<string, unknown>,
): boolean {
  const token = environment.CORE_TO_GITHUB_INTEGRATION_TOKEN;
  return typeof token === 'string' && token.length > 0 && !/\s/.test(token);
}

export function hasRequiredRuntimeConfiguration(environment: Record<string, unknown>): boolean {
  return hasCoreServiceCredential(environment) &&
    typeof environment.GITHUB_APP_ID === 'string' && /^[1-9]\d{0,19}$/.test(environment.GITHUB_APP_ID) &&
    typeof environment.GITHUB_APP_PRIVATE_KEY_BASE64 === 'string' && environment.GITHUB_APP_PRIVATE_KEY_BASE64.length > 0;
}

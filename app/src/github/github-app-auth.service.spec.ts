import { generateKeyPairSync } from 'node:crypto';
import { jwtVerify } from 'jose';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GithubAppAuthService } from './github-app-auth.service.js';
import { GithubApiError, GithubIntegrationError } from './errors.js';

function appKey(): { encoded: string; publicKey: ReturnType<typeof generateKeyPairSync>['publicKey'] } {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = pair.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
  return { encoded: Buffer.from(pem).toString('base64'), publicKey: pair.publicKey };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('GithubAppAuthService', () => {
  it('signs a short-lived App JWT and caches installation tokens only in memory', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({
      token: 'ghs-format-is-opaque', expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    })) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '4935151' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    const jwt = await service.signAppJwt();
    const verified = await jwtVerify(jwt, key.publicKey);
    expect(verified.protectedHeader.alg).toBe('RS256');
    expect(verified.payload.iss).toBe('4935151');
    expect((verified.payload.exp ?? 0) - (verified.payload.iat ?? 0)).toBeLessThanOrEqual(9 * 60 + 30);

    await expect(service.getInstallationToken('12')).resolves.toBe('ghs-format-is-opaque');
    await expect(service.getInstallationToken('12')).resolves.toBe('ghs-format-is-opaque');
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('ghs-format-is-opaque');
  });

  it('maps missing installations without exposing the upstream response body', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'private upstream detail' }, 404)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);

    await expect(service.getInstallationToken('12')).rejects.toBeInstanceOf(GithubApiError);
    api.request.mockResolvedValueOnce(json({ message: 'private upstream detail' }, 503));
    const error = await service.getAppInfo().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect((error as Error).message).not.toContain('private upstream detail');
  });

  it('does not classify an ambiguous GitHub App 403 as broken App credentials', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'secondary rate limit' }, 403)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    await expect(service.getAppInfo()).rejects.toMatchObject({
      code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503, retryable: true,
    });
  });

  it('lists organization installations only, preserves suspension, and excludes personal installs', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json([
      { id: 1, account: { id: 101, login: 'owner', type: 'User' } },
      { id: 2, account: { id: 202, login: 'acme', type: 'Organization', avatar_url: 'https://avatars.example/acme' }, suspended_at: '2026-01-01T00:00:00Z' },
    ])) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);

    await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'OK', value: [{
      installationId: '2', organizationId: '202', organizationLogin: 'acme',
      avatarUrl: 'https://avatars.example/acme', suspended: true,
    }] });
    expect(api.request.mock.calls[0][0]).toBe('/app/installations?per_page=100&page=1');
  });

  it('does not interpret an installations endpoint 404 as an empty installation list', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'no app visibility' }, 404)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  describe('motivos de UNVERIFIABLE en listOrganizationInstallations', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function orgEntry(id: number): unknown {
      return { id, account: { id: id + 1000, login: 'acme', type: 'Organization' } };
    }

    it('registra JWT_NO_FIRMABLE cuando la clave no permite firmar', async () => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const api = { request: vi.fn() };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : Buffer.from('no es una clave').toString('base64') };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(api.request).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain('motivo=JWT_NO_FIRMABLE');
    });

    it('registra GITHUB_SIN_RESPUESTA con duracion cuando la llamada a GitHub falla', async () => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const key = appKey();
      const api = { request: vi.fn().mockRejectedValue(new TypeError('fetch failed')) };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toMatch(/motivo=GITHUB_SIN_RESPUESTA duracionMs=\d+/);
    });

    it.each([401, 403, 404, 429])('registra GITHUB_HTTP_%i con el estatus de GitHub', async (status) => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const key = appKey();
      const api = { request: vi.fn().mockResolvedValue(json({ message: 'upstream' }, status)) };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain(`motivo=GITHUB_HTTP_${status}`);
    });

    it('registra RESPUESTA_NO_ES_LISTA cuando el cuerpo no es un arreglo', async () => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const key = appKey();
      const api = { request: vi.fn().mockResolvedValue(json({ message: 'objeto' })) };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain('motivo=RESPUESTA_NO_ES_LISTA');
    });

    it('registra INSTALACION_INVALIDA con tipo del conjunto cerrado', async () => {
      const key = appKey();
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const cases: Array<[unknown, string]> = [
        [{ id: 1, account: null }, 'INSTALACION_INVALIDA:AUSENTE'],
        [{ id: 1, account: { id: 5, login: 'bot', type: 'Bot' } }, 'INSTALACION_INVALIDA:OTRO'],
        [{ id: 1.5, account: { id: 5, login: 'acme', type: 'Organization' } }, 'INSTALACION_INVALIDA:Organization'],
      ];
      for (const [entry, expected] of cases) {
        const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const api = { request: vi.fn().mockResolvedValue(json([entry])) };
        const service = new GithubAppAuthService(config as never, api as never);

        await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(String(spy.mock.calls[0][0])).toContain(`motivo=${expected}`);
        vi.restoreAllMocks();
      }
    });

    it('registra DEMASIADAS_PAGINAS al agotar las paginas', async () => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const key = appKey();
      const page = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, account: { id: index + 1, login: 'u', type: 'User' } }));
      const api = { request: vi.fn().mockImplementation(async () => json(page)) };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(api.request).toHaveBeenCalledTimes(10);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain('motivo=DEMASIADAS_PAGINAS');
    });

    it('no registra datos sensibles, ids, logins ni texto de error en ningun WARN', async () => {
      const clave = 'CLAVE-SENTINELA-PRIVADA';
      const token = 'ghs_TOKEN_SENTINELA';
      const login = 'secret-org-login';
      const idSentinela = 987654321;
      const cuerpo = 'Bad credentials CUERPO-SENTINELA';
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : Buffer.from(clave).toString('base64') };

      await new GithubAppAuthService(config as never, { request: vi.fn() } as never).listOrganizationInstallations();

      const key = appKey();
      const validConfig = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const rejecting = { request: vi.fn().mockRejectedValue(new Error(`fallo ${token} ${clave} ${login} ${idSentinela}`)) };
      await expect(new GithubAppAuthService(validConfig as never, rejecting as never).listOrganizationInstallations())
        .resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(rejecting.request).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls.map((call) => String(call[0])).some((text) => text.includes('motivo=GITHUB_SIN_RESPUESTA'))).toBe(true);

      const bodies = [
        json({ message: cuerpo }, 500),
        json([{ id: idSentinela, account: { id: 'x', login, type: 'Organization' } }]),
        json([{ id: 2, account: { id: 3, login, type: 'Bot' } }]),
      ];
      for (const body of bodies) {
        await new GithubAppAuthService(validConfig as never, { request: vi.fn().mockResolvedValue(body) } as never)
          .listOrganizationInstallations();
      }

      const texts = spy.mock.calls.map((call) => JSON.stringify(call));
      expect(texts.length).toBeGreaterThan(0);
      for (const sentinel of [clave, token, login, String(idSentinela), cuerpo, 'Bad credentials', 'eyJ', 'PRIVATE KEY', 'fallo']) {
        for (const text of texts) expect(text).not.toContain(sentinel);
      }
    });

    it('no emite WARN en el camino correcto', async () => {
      const spy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const key = appKey();
      const api = { request: vi.fn().mockResolvedValue(json([orgEntry(2)])) };
      const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
      const service = new GithubAppAuthService(config as never, api as never);

      await expect(service.listOrganizationInstallations()).resolves.toMatchObject({ status: 'OK' });
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateContract } from '../contracts/contract-validator.js';
import { normalizeGithubWebhook } from './github-webhook-normalizer.js';

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../spec/contracts/schemas/examples');
const readJson = (file: string) => JSON.parse(readFileSync(resolve(examplesDir, file), 'utf8')) as unknown;
const webhookEvent = (body: unknown) => validateContract('github-webhook-event.schema.json', 'GithubWebhookEvent', body);

const manifest = readJson('manifest.json') as { examples: Array<{ file: string; schema: string; definition: string }> };
const githubEntries = manifest.examples.filter((entry) => entry.file.startsWith('github-webhook-event.'));

const sha = (char: string) => char.repeat(40);
const repository = { id: 1001, full_name: 'acme/widgets' };
const pullRequest = (overrides: Record<string, unknown> = {}) => ({
  created_at: '2026-10-24T09:55:00Z',
  title: 'Add feature',
  draft: false,
  merged: false,
  base: { ref: 'main', sha: sha('a') },
  head: { ref: 'feature', sha: sha('b') },
  user: { login: 'contributor' },
  ...overrides,
});

describe('contrato github-webhook-event sobre ejemplos canónicos', () => {
  it('el manifest declara 15 ejemplos github-webhook-event (13 eventos y 2 respuestas aceptadas)', () => {
    expect(githubEntries).toHaveLength(15);
    expect(githubEntries.filter((entry) => entry.definition === 'GithubWebhookEvent')).toHaveLength(13);
    expect(githubEntries.filter((entry) => entry.definition === 'GitHubWebhookAcceptedResponse')).toHaveLength(2);
  });

  it.each(githubEntries.map((entry) => [entry.file, entry.definition] as const))('%s valida contra %s', (file, definition) => {
    const result = validateContract('github-webhook-event.schema.json', definition, readJson(file));
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('salida del normalizador cumple GithubWebhookEvent', () => {
  it.each([
    ['pull_request opened', 'pull_request', { action: 'opened', number: 7, installation: { id: 2001 }, repository, pull_request: pullRequest() }, 'PULL_REQUEST'],
    ['pull_request synchronize', 'pull_request', { action: 'synchronize', number: 7, installation: { id: 2001 }, repository, pull_request: pullRequest() }, 'PULL_REQUEST'],
    ['pull_request closed con merged', 'pull_request', { action: 'closed', number: 7, installation: { id: 2001 }, repository, pull_request: pullRequest({ merged: true }) }, 'PULL_REQUEST'],
    ['pull_request con nulls', 'pull_request', { action: 'opened', number: 7, repository, pull_request: pullRequest({ created_at: undefined, user: null }) }, 'PULL_REQUEST'],
    ['repository con owner', 'repository', { action: 'created', repository: { ...repository, owner: { id: 501, login: 'acme', type: 'Organization' } }, installation: { id: 2001 } }, 'REPOSITORY'],
    ['repository sin owner', 'repository', { action: 'created', repository: { ...repository, owner: null } }, 'REPOSITORY'],
    ['installation con account', 'installation', { action: 'created', installation: { id: 2001, account: { id: 501, type: 'Organization' } } }, 'INSTALLATION'],
    ['installation sin account', 'installation', { action: 'deleted', installation: { id: 2001 } }, 'INSTALLATION'],
    ['installation_repositories vacia', 'installation_repositories', { action: 'added', installation: { id: 2001 }, repositories_added: [], repositories_removed: [] }, 'INSTALLATION_REPOSITORIES'],
    ['installation_repositories con cambios', 'installation_repositories', {
      action: 'added', installation: { id: 2001 },
      repositories_added: [{ id: 1002, full_name: 'acme/new' }],
      repositories_removed: [{ id: 1003, full_name: 'acme/old' }],
    }, 'INSTALLATION_REPOSITORIES'],
    ['organization con membership', 'organization', {
      action: 'member_added', organization: { id: 501, login: 'acme' }, membership: { user: { id: 10 } },
    }, 'ORGANIZATION'],
    ['organization sin membership', 'organization', { action: 'renamed', organization: { id: 501, login: 'acme' } }, 'ORGANIZATION'],
    ['membership', 'membership', { action: 'added', member: { id: 10 }, organization: { id: 501 } }, 'MEMBERSHIP'],
    ['member', 'member', { action: 'added', member: { id: 10 }, repository }, 'MEMBER'],
    ['team', 'team', { action: 'added_to_repository', team: { id: 30 }, repository, organization: { id: 501 } }, 'TEAM'],
    ['evento ignorado ping', 'ping', { zen: 'Keep it logically awesome.', hook_id: 1 }, 'IGNORED'],
    ['evento ignorado push sin action', 'push', { ref: 'refs/heads/main' }, 'IGNORED'],
  ])('%s', (_name, eventName, payload, kind) => {
    const normalized = normalizeGithubWebhook('delivery-contract', eventName, payload, new Date('2026-10-24T10:00:00.000Z'));
    const result = webhookEvent(normalized);
    expect(normalized.data.kind).toBe(kind);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('ejemplo canónico adulterado', () => {
  it('un clon de pull-request.opened sin pullRequest.title no valida', () => {
    const example = readJson('github-webhook-event.pull-request.opened.json') as { data: { pullRequest: Record<string, unknown> } };
    delete example.data.pullRequest.title;
    const result = webhookEvent(example);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('caracterización de action frente al esquema', () => {
  it('el normalizador no limita action a 100 caracteres; el esquema sí lo hace (informativo)', () => {
    const longAction = 'a'.repeat(101);
    const normalized = normalizeGithubWebhook('delivery-long-action', 'repository', {
      action: longAction, repository: { id: 1001, full_name: 'acme/widgets' },
    });

    expect(normalized.action).toBe(longAction);
    const result = webhookEvent(normalized);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.startsWith('/action'))).toBe(true);
  });

  it('un evento normalizado sin deliveryId no valida', () => {
    const { deliveryId: _omitted, ...withoutDelivery } = normalizeGithubWebhook('delivery-missing', 'ping', {});
    const result = webhookEvent(withoutDelivery);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

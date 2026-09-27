import { describe, expect, it } from 'vitest';
import { GithubIntegrationError } from '../github/errors.js';
import { normalizeGithubWebhook } from './github-webhook-normalizer.js';

describe('GitHub webhook normalizer', () => {
  it('normalizes pull request fields and converts numeric ids to strings', () => {
    const normalized = normalizeGithubWebhook('delivery-1', 'pull_request', {
      action: 'opened',
      number: 12,
      installation: { id: 42 },
      repository: { id: 101, full_name: 'acme/widgets' },
      pull_request: {
        created_at: '2026-09-24T11:30:00-05:00',
        title: 'Add feature', draft: false, merged: false,
        base: { ref: 'main', sha: 'a'.repeat(40) },
        head: { ref: 'feature', sha: 'b'.repeat(40) },
        user: { login: 'contributor' },
      },
    }, new Date('2026-09-25T12:00:00.000Z'));

    expect(normalized).toEqual({
      schemaVersion: 1,
      deliveryId: 'delivery-1',
      eventName: 'pull_request',
      action: 'opened',
      receivedAt: '2026-09-25T12:00:00.000Z',
      data: {
        kind: 'PULL_REQUEST',
        repository: { id: '101', fullName: 'acme/widgets' },
        installationId: '42',
        pullRequestNumber: 12,
        pullRequest: {
          title: 'Add feature', draft: false, merged: false, createdAt: '2026-09-24T16:30:00.000Z',
          base: { ref: 'main', sha: 'a'.repeat(40) },
          head: { ref: 'feature', sha: 'b'.repeat(40) },
          userLogin: 'contributor',
        },
      },
    });
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'not-a-date'],
    ['invalid calendar date', '2026-02-30T12:00:00Z'],
    ['date without a timezone', '2026-09-25T12:00:00'],
    ['date-only value', '2026-09-25'],
    ['unknown offset', '2026-09-25T12:00:00-00:00'],
  ])('keeps a pull request when its creation date is %s and sets createdAt to null', (_case, createdAt) => {
    const normalized = normalizeGithubWebhook('delivery-date', 'pull_request', {
      number: 12,
      repository: { id: 101, full_name: 'acme/widgets' },
      pull_request: {
        ...(createdAt === undefined ? {} : { created_at: createdAt }),
        title: 'Add feature', draft: false, merged: false,
        base: { ref: 'main', sha: 'a'.repeat(40) },
        head: { ref: 'feature', sha: 'b'.repeat(40) },
      },
    }, new Date('2026-09-25T12:00:00.000Z'));

    expect(normalized.data).toMatchObject({ kind: 'PULL_REQUEST', pullRequest: { createdAt: null } });
    expect(normalized.receivedAt).toBe('2026-09-25T12:00:00.000Z');
  });

  it('normalizes absent optional fields and lists to null and empty arrays', () => {
    expect(normalizeGithubWebhook('delivery-2', 'installation_repositories', {
      installation: { id: 7 },
    }).data).toEqual({ kind: 'INSTALLATION_REPOSITORIES', installationId: '7', added: [], removed: [] });
    expect(normalizeGithubWebhook('delivery-3', 'repository', {
      repository: { id: 2, full_name: 'acme/repo' },
    }).data).toEqual({
      kind: 'REPOSITORY',
      repository: { id: '2', fullName: 'acme/repo', owner: null },
      installationId: null,
    });
  });

  it.each([
    ['installation', { installation: { id: 7, account: { id: 8, type: 'Organization' } } }, {
      kind: 'INSTALLATION', installationId: '7', account: { id: '8', type: 'Organization' },
    }],
    ['installation_repositories', {
      installation: { id: 7 }, repositories_added: [{ id: 8, full_name: 'acme/new' }],
      repositories_removed: [{ id: 9, full_name: 'acme/old' }],
    }, {
      kind: 'INSTALLATION_REPOSITORIES', installationId: '7',
      added: [{ id: '8', fullName: 'acme/new' }], removed: [{ id: '9', fullName: 'acme/old' }],
    }],
    ['member', { member: { id: 10 }, repository: { id: 11 } }, {
      kind: 'MEMBER', memberId: '10', repositoryId: '11',
    }],
    ['membership', { member: { id: 10 }, organization: { id: 12 } }, {
      kind: 'MEMBERSHIP', memberId: '10', organizationId: '12',
    }],
    ['organization', {
      organization: { id: 12, login: 'acme' }, membership: { user: { id: 10 } },
    }, {
      kind: 'ORGANIZATION', organizationId: '12', organizationLogin: 'acme', membershipUserId: '10',
    }],
    ['team', { repository: { id: 11 }, organization: { id: 12 } }, {
      kind: 'TEAM', repositoryId: '11', organizationId: '12',
    }],
  ])('normalizes the %s lifecycle event', (eventName, payload, expected) => {
    expect(normalizeGithubWebhook(`delivery-${eventName}`, eventName, payload).data).toEqual(expected);
  });

  it('ignores an unknown nonempty event without exposing its payload', () => {
    expect(normalizeGithubWebhook('delivery-4', 'check_run', { action: 'completed', secret: 'not-forwarded' }).data)
      .toEqual({ kind: 'IGNORED' });
  });

  it('rejects missing required payload fields and invalid event names', () => {
    expect(() => normalizeGithubWebhook('delivery-5', 'pull_request', {})).toThrowError(GithubIntegrationError);
    expect(() => normalizeGithubWebhook('delivery-6', '', {})).toThrowError(GithubIntegrationError);
  });
});

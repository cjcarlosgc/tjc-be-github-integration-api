import { describe, expect, it, vi } from 'vitest';
import { GithubPublicationService } from './github-publication.service.js';
import { GithubIntegrationError } from './errors.js';

const sha = (character: string): string => character.repeat(40);
const sourceHeadSha = sha('a');
const blobSha = sha('b');
const treeSha = sha('c');
const commitSha = sha('d');
const repo = 'acme/widgets';
const installationId = '13';
const pullRequestNumber = 42;
const sourceHeadRef = 'feature/new-tests';
const sourcePullRequest = (overrides: Record<string, unknown> = {}) => ({
  state: 'open',
  head: { sha: sourceHeadSha, ref: sourceHeadRef },
  base: { ref: 'main' },
  ...overrides,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serviceFor(responses: Response[], initialState: 'RESERVED' | 'ACTIVE' | 'CREATE_UNKNOWN' | 'UPDATE_UNKNOWN' = 'RESERVED'):
  { service: GithubPublicationService; request: ReturnType<typeof vi.fn>; coordination: { claim: ReturnType<typeof vi.fn>; transition: ReturnType<typeof vi.fn> } } {
  const request = vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error('Unexpected GitHub API request');
    return response;
  });
  const appAuth = {
    getInstallationToken: vi.fn().mockResolvedValue('installation-token'),
    getConfiguredAppId: vi.fn().mockReturnValue('77'),
  };
  let state = initialState;
  const coordination = {
    claim: vi.fn().mockImplementation(async () => ({
      state, checkId: initialState === 'ACTIVE' || initialState === 'UPDATE_UNKNOWN' ? '321' : null,
      requestHash: null, leaseToken: '1',
    })),
    transition: vi.fn().mockImplementation(async (_identity, _token, nextState) => { state = nextState; }),
  };
  return { service: new GithubPublicationService({ request } as never, appAuth as never, coordination as never), request, coordination };
}

function readyPrefix(): Response[] {
  return [json(sourcePullRequest()), json([]), json([])];
}

const publicationRequest = {
  installationId,
  repositoryName: repo,
  pullRequestNumber,
  sourceHeadSha,
};

const finalizeRequest = {
  ...publicationRequest,
  sourceHeadRef,
  analysisRunId: 'run-1',
  proposalFiles: [{ path: 'tests/generated.spec.ts', blobSha }],
};

describe('GithubPublicationService', () => {
  const checkInput = {
    ...publicationRequest,
    name: 'RAG validation',
    headSha: sourceHeadSha,
    conclusion: 'success' as const,
    title: 'Passed',
    summary: 'Analysis complete.',
    detailsUrl: 'https://app.example/runs/1',
  };

  it('creates a completed Check from Core-owned values and returns its durable ID', async () => {
    const { service, request } = serviceFor([json({ id: 1 }), json({ total_count: 0, check_suites: [] }), json({ id: 99 }, 201)]);
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '99' });

    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[2][0]).toBe('/repos/acme/widgets/check-runs');
    expect(request.mock.calls[2][2]).toMatchObject({
      method: 'POST',
      body: {
        name: 'RAG validation', head_sha: sourceHeadSha, status: 'completed', conclusion: 'success',
        details_url: 'https://app.example/runs/1', output: { title: 'Passed', summary: 'Analysis complete.' },
      },
    });
  });

  it('updates the single matching Check by its ID and preserves that ID', async () => {
    const { service, request } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ id: 321 }),
    ]);
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(request.mock.calls[2][0]).toBe('/repos/acme/widgets/check-suites/55/check-runs?check_name=RAG%20validation&filter=all&per_page=100&page=1');
    expect(request.mock.calls[3][0]).toBe('/repos/acme/widgets/check-runs/321');
    expect(request.mock.calls[3][2]).toMatchObject({ method: 'PATCH' });
  });

  it('persists CREATE_UNKNOWN before the remote create and ACTIVE before returning its ID', async () => {
    let created = false;
    const request = vi.fn(async (path: string, _token: string, options?: { method?: string }) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) {
        return json(created
          ? { total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }
          : { total_count: 0, check_suites: [] });
      }
      if (path.includes('/check-suites/55/check-runs?')) return json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] });
      if (options?.method === 'POST') {
        created = true;
        return json({ id: 321 }, 201);
      }
      if (options?.method === 'PATCH') return json({ id: 321 });
      throw new Error('Unexpected request');
    });
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const coordination = {
      claim: vi.fn().mockResolvedValue({ state: 'RESERVED', checkId: null, requestHash: null, leaseToken: '1' }),
      transition: vi.fn().mockResolvedValue(undefined),
    };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['CREATE_UNKNOWN', 'ACTIVE']);
  });

  it('records a confirmed 422 rejection and replays the same neutral result without another POST', async () => {
    let state = 'RESERVED';
    let storedHash: string | null = null;
    const request = vi.fn(async (path: string, _token: string, options?: { method?: string }) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) return json({ total_count: 0, check_suites: [] });
      if (options?.method === 'POST') return json({ message: 'do not expose this body' }, 422);
      throw new Error('Unexpected request');
    });
    const coordination = {
      claim: vi.fn().mockImplementation(async (_identity, requestedHash) => ({
        state, checkId: null, requestHash: storedHash ?? requestedHash, leaseToken: String(coordination.claim.mock.calls.length),
      })),
      transition: vi.fn().mockImplementation(async (_identity, _token, nextState, requestHash) => {
        state = nextState;
        storedHash = requestHash;
      }),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);
    const expected = { code: 'GITHUB_CHECK_CREATE_REJECTED', status: 422, retryable: false };

    const firstError = await service.createCheck(checkInput as never).catch((error: unknown) => error);
    expect(firstError).toMatchObject(expected);
    expect((firstError as Error).message).not.toContain('do not expose this body');
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject(expected);

    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.some(([, , options]) => options?.method === 'PATCH')).toBe(false);
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['CREATE_UNKNOWN', 'CREATE_REJECTED']);
  });

  it('adopts and updates a matching Check found after a 422', async () => {
    let searchCount = 0;
    const request = vi.fn(async (path: string, _token: string, options?: { method?: string }) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) {
        searchCount += 1;
        return searchCount === 1
          ? json({ total_count: 0, check_suites: [] })
          : json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] });
      }
      if (path.includes('/check-suites/55/check-runs?')) {
        return json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] });
      }
      if (options?.method === 'POST') return json({ message: 'untrusted upstream body' }, 422);
      if (path.endsWith('/check-runs/321') && options?.method === 'PATCH') return json({ id: 321 });
      throw new Error('Unexpected request');
    });
    const coordination = {
      claim: vi.fn().mockResolvedValue({ state: 'RESERVED', checkId: null, leaseToken: '1' }),
      transition: vi.fn().mockResolvedValue(undefined),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['CREATE_UNKNOWN', 'ACTIVE', 'UPDATE_UNKNOWN', 'ACTIVE']);
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter(([path, , options]) => path.endsWith('/check-runs/321') && options?.method === 'PATCH')).toHaveLength(1);
  });

  it('does not send POST when persisting CREATE_UNKNOWN fails', async () => {
    const request = vi.fn(async (path: string) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) return json({ total_count: 0, check_suites: [] });
      throw new Error('A GitHub mutation must not happen');
    });
    const coordination = {
      claim: vi.fn().mockResolvedValue({ state: 'RESERVED', checkId: null, leaseToken: '1' }),
      transition: vi.fn().mockRejectedValue(new GithubIntegrationError('GITHUB_CHECK_COORDINATION_UNAVAILABLE', 'Unavailable.', 503, true)),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
  });

  it('does not send PATCH when persisting UPDATE_UNKNOWN fails', async () => {
    const request = vi.fn(async (path: string) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) return json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] });
      if (path.includes('/check-runs?')) return json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] });
      throw new Error('A GitHub mutation must not happen');
    });
    const coordination = {
      claim: vi.fn().mockResolvedValue({ state: 'RESERVED', checkId: null, leaseToken: '1' }),
      transition: vi.fn().mockRejectedValue(new GithubIntegrationError('GITHUB_CHECK_COORDINATION_UNAVAILABLE', 'Unavailable.', 503, true)),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    expect(request.mock.calls.some(([, , options]) => options?.method === 'PATCH')).toBe(false);
  });

  it('reconciles a remotely successful POST when persisting ACTIVE fails without sending a second POST', async () => {
    let remoteCreated = false;
    let state: 'RESERVED' | 'CREATE_UNKNOWN' = 'RESERVED';
    let failActiveOnce = true;
    const request = vi.fn(async (path: string, _token: string, options?: { method?: string }) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-suites?')) return remoteCreated
        ? json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] })
        : json({ total_count: 0, check_suites: [] });
      if (path.includes('/check-suites/55/check-runs?')) return json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] });
      if (options?.method === 'POST') {
        remoteCreated = true;
        return json({ id: 321 }, 201);
      }
      if (options?.method === 'PATCH') return json({ id: 321 });
      throw new Error('Unexpected request');
    });
    const coordination = {
      claim: vi.fn().mockImplementation(async () => ({ state, checkId: null, leaseToken: String(coordination.claim.mock.calls.length) })),
      transition: vi.fn().mockImplementation(async (_identity, _token, nextState) => {
        if (nextState === 'ACTIVE' && failActiveOnce) {
          failActiveOnce = false;
          throw new Error('ACTIVE write failed after remote success');
        }
        state = nextState;
      }),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'PATCH')).toHaveLength(1);
  });

  it('reconciles a remotely successful PATCH when persisting ACTIVE fails without sending a second PATCH', async () => {
    let failActiveOnce = true;
    let state: 'ACTIVE' | 'UPDATE_UNKNOWN' = 'ACTIVE';
    const matchingCheck = {
      id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 }, status: 'completed',
      conclusion: checkInput.conclusion, output: { title: checkInput.title, summary: checkInput.summary }, details_url: checkInput.detailsUrl,
    };
    const request = vi.fn(async (path: string, _token: string, options?: { method?: string }) => {
      if (path === '/repos/acme/widgets') return json({ id: 1 });
      if (path.includes('/check-runs/321') && !options?.method) return json(matchingCheck);
      if (path.includes('/check-suites?')) return json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] });
      if (path.includes('/check-suites/55/check-runs?')) return json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] });
      if (options?.method === 'PATCH') return json({ id: 321 });
      throw new Error('Unexpected request');
    });
    const coordination = {
      claim: vi.fn().mockImplementation(async () => ({ state, checkId: '321', leaseToken: String(coordination.claim.mock.calls.length) })),
      transition: vi.fn().mockImplementation(async (_identity, _token, nextState) => {
        if (nextState === 'ACTIVE' && failActiveOnce) {
          failActiveOnce = false;
          throw new Error('ACTIVE write failed after remote success');
        }
        state = nextState;
      }),
    };
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'PATCH')).toHaveLength(1);
  });

  it('never repeats a POST after its result is uncertain, even when a complete retry search is empty', async () => {
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }), json({ total_count: 0, check_suites: [] }),
      new Response(JSON.stringify({ message: 'unknown' }), { status: 500 }),
      json({ id: 1 }), json({ total_count: 0, check_suites: [] }),
    ]);
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE' });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
    expect(coordination.claim).toHaveBeenCalledTimes(2);
    expect(coordination.transition.mock.calls.some((call) => call[2] === 'CREATE_REJECTED')).toBe(false);
  });

  it('reconciles an uncertain update by checkId GET and does not PATCH again', async () => {
    const matchingCheck = {
      id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 }, status: 'completed',
      conclusion: checkInput.conclusion, output: { title: checkInput.title, summary: checkInput.summary }, details_url: checkInput.detailsUrl,
    };
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 1, check_runs: [{ id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json(matchingCheck),
    ], 'UPDATE_UNKNOWN');
    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '321' });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'PATCH')).toHaveLength(0);
    expect(request).toHaveBeenCalledTimes(4);
    expect(coordination.transition).toHaveBeenCalledWith(expect.anything(), '1', 'ACTIVE', expect.any(String), '321');
  });

  it('adopts and updates the sole exact-identity candidate instead of a stale ACTIVE checkId', async () => {
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 1, check_runs: [{ id: 322, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ id: 322 }),
    ], 'ACTIVE');

    await expect(service.createCheck(checkInput as never)).resolves.toEqual({ checkId: '322' });
    expect(request.mock.calls.map(([path, , options]) => options?.method === 'PATCH' ? path : null).filter(Boolean))
      .toEqual(['/repos/acme/widgets/check-runs/322']);
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
    expect(coordination.transition.mock.calls.map((call) => [call[2], call[4]])).toEqual([
      ['ACTIVE', '322'], ['UPDATE_UNKNOWN', '322'], ['ACTIVE', '322'],
    ]);
  });

  it('marks a missing ACTIVE Check ambiguous when complete identity search finds several candidates', async () => {
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 2, check_runs: [
        { id: 322, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
        { id: 323, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
      ] }),
    ], 'ACTIVE');

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({
      code: 'GITHUB_CHECK_IDENTITY_AMBIGUOUS', status: 409, retryable: false,
    });
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'PATCH')).toHaveLength(0);
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['AMBIGUOUS']);
  });

  it('returns 409 without PATCH when an ACTIVE checkId is still present among duplicate identity candidates', async () => {
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 2, check_runs: [
        { id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
        { id: 322, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
      ] }),
    ], 'ACTIVE');

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({
      code: 'GITHUB_CHECK_IDENTITY_AMBIGUOUS', status: 409, retryable: false,
    });
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.some(([, , options]) => options?.method === 'PATCH')).toBe(false);
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['AMBIGUOUS']);
  });

  it('blocks a missing ACTIVE Check with zero candidates for manual reconciliation without replacement POST', async () => {
    const { service, request, coordination } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 0, check_suites: [] }),
    ], 'ACTIVE');

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({
      code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE', status: 503,
    });
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
    expect(coordination.transition.mock.calls.map((call) => call[2])).toEqual(['RECONCILIATION_REQUIRED']);
  });

  it.each([
    ['GITHUB_CHECK_IDENTITY_AMBIGUOUS', 409, false],
    ['GITHUB_CHECK_COORDINATION_UNAVAILABLE', 503, false],
  ] as const)('does not mutate GitHub when a terminal reservation is replayed (%s)', async (code, status, retryable) => {
    const request = vi.fn().mockResolvedValue(json({ id: 1 }));
    const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token'), getConfiguredAppId: vi.fn().mockReturnValue('77') };
    const coordination = {
      claim: vi.fn().mockRejectedValue(new GithubIntegrationError(code, 'terminal', status, retryable)),
      transition: vi.fn(),
    };
    const service = new GithubPublicationService({ request } as never, appAuth as never, coordination as never);

    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code, status, retryable });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/repos/acme/widgets');
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST' || options?.method === 'PATCH')).toBe(false);
    expect(coordination.transition).not.toHaveBeenCalled();
  });

  it('returns non-retryable 409 and performs no write for duplicate candidates', async () => {
    const { service, request } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 2, check_runs: [
        { id: 321, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
        { id: 322, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } },
      ] }),
    ]);
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({
      code: 'GITHUB_CHECK_IDENTITY_AMBIGUOUS', status: 409, retryable: false,
    });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('traverses every page before deciding that the identity is ambiguous', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: 1000 + index, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 },
    }));
    const { service, request } = serviceFor([
      json({ id: 1 }),
      json({ total_count: 1, check_suites: [{ id: 55, head_sha: sourceHeadSha, app: { id: 77 } }] }),
      json({ total_count: 101, check_runs: firstPage }),
      json({ total_count: 101, check_runs: [{ id: 2000, name: checkInput.name, head_sha: sourceHeadSha, app: { id: 77 } }] }),
    ]);
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_IDENTITY_AMBIGUOUS', status: 409 });
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls[2][0]).toContain('&page=1');
    expect(request.mock.calls[3][0]).toContain('&page=2');
  });

  it('fails closed when the complete Check search fails', async () => {
    const { service, request } = serviceFor([json({ id: 1 }), json({ message: 'private' }, 500)]);
    await expect(service.createCheck(checkInput as never)).rejects.toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE', status: 503 });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns the exact status-only READY preflight after verifying the live head and companion PR', async () => {
    const { service, request } = serviceFor(readyPrefix());
    await expect(service.preflight(publicationRequest)).resolves.toEqual({ status: 'READY' });
    expect(request.mock.calls[1][0]).toContain('head=acme%3Arag-tests%2Fpr-42-aaaaaaa&base=feature%2Fnew-tests&state=closed&per_page=1');
    expect(request.mock.calls[2][0]).toContain('&state=open&per_page=1');
  });

  it('returns STALE without writing a blob when the PR head changed', async () => {
    const { service, request } = serviceFor([json(sourcePullRequest({ head: { sha: sha('e'), ref: sourceHeadRef } }))]);
    await expect(service.uploadProposalBlob({
      ...publicationRequest, path: 'tests/generated.spec.ts', contentBase64: Buffer.from('hello').toString('base64'),
    } as never)).resolves.toEqual({ status: 'STALE' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('returns EXISTING_PR_CLOSED before creating a blob or moving a reference', async () => {
    const { service, request } = serviceFor([
      json(sourcePullRequest()),
      json([{ number: 7, html_url: 'https://github.com/acme/widgets/pull/7', state: 'closed' }]),
    ]);
    await expect(service.uploadProposalBlob({
      ...publicationRequest, path: 'tests/generated.spec.ts', contentBase64: Buffer.from('hello').toString('base64'),
    } as never)).resolves.toEqual({ status: 'EXISTING_PR_CLOSED', number: 7 });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toContain('&state=closed&per_page=1');
  });

  it('uploads one UTF-8 base64 blob after revalidating the source PR', async () => {
    const base64 = Buffer.from('export const value = 1;\n', 'utf8').toString('base64');
    const { service, request } = serviceFor([...readyPrefix(), json({ sha: blobSha }, 201)]);
    await expect(service.uploadProposalBlob({
      ...publicationRequest, path: 'tests/generated.spec.ts', contentBase64: base64,
    } as never)).resolves.toEqual({ status: 'UPLOADED', path: 'tests/generated.spec.ts', blobSha });
    expect(request.mock.calls[3][0]).toBe('/repos/acme/widgets/git/blobs');
    expect(request.mock.calls[3][2]).toMatchObject({ method: 'POST', body: { content: base64, encoding: 'base64' } });
    expect(request.mock.calls[3][2]).toMatchObject({ timeoutMs: 180_000 });
  });

  it('rejects empty, malformed, non-UTF-8 blobs and duplicate final paths before GitHub effects', async () => {
    const { service, request } = serviceFor([]);
    for (const contentBase64 of ['', 'not-base64', Buffer.from([0xff]).toString('base64')]) {
      await expect(service.uploadProposalBlob({
        ...publicationRequest, path: 'tests/generated.spec.ts', contentBase64,
      } as never)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    }
    await expect(service.finalize({
      ...finalizeRequest,
      proposalFiles: [finalizeRequest.proposalFiles[0], finalizeRequest.proposalFiles[0]],
    } as never)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(request).not.toHaveBeenCalled();
  });

  it('builds Git objects, rechecks freshness before visible writes, and creates one companion PR', async () => {
    const responses = [
      ...readyPrefix(),
      json({ object: { sha: sourceHeadSha } }, 404),
      json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201),
      json({ sha: commitSha }, 201),
      ...readyPrefix(),
      json({}, 404),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }, 201),
      ...readyPrefix(),
      json({ number: 51, html_url: 'https://github.com/acme/widgets/pull/51', state: 'open' }, 201),
    ];
    const { service, request } = serviceFor(responses);

    await expect(service.finalize(finalizeRequest as never)).resolves.toEqual({
      status: 'PUBLISHED',
      branchName: 'rag-tests/pr-42-aaaaaaa',
      commitSha,
      pullRequest: { number: 51, url: 'https://github.com/acme/widgets/pull/51' },
    });
    const calls = request.mock.calls.map(([path, , options]) => ({ path, method: (options as { method?: string } | undefined)?.method ?? 'GET' }));
    expect(calls.filter((call) => call.path.endsWith('/git/refs') && call.method === 'POST')).toHaveLength(1);
    expect(calls.filter((call) => call.path.endsWith('/pulls') && call.method === 'POST')).toHaveLength(1);
    const treeCall = request.mock.calls.find(([path]) => path.endsWith('/git/trees'));
    expect(treeCall?.[2]).toMatchObject({ body: { base_tree: treeSha, tree: [{ path: 'tests/generated.spec.ts', mode: '100644', type: 'blob', sha: blobSha }] } });
  });

  it('returns STALE before creating a branch when freshness changes during object preparation', async () => {
    const stalePullRequest = sourcePullRequest({ head: { sha: sha('f'), ref: sourceHeadRef } });
    const responses = [
      ...readyPrefix(),
      json({}, 404),
      json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201),
      json({ sha: commitSha }, 201),
      json(stalePullRequest),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).resolves.toEqual({ status: 'STALE' });
    expect(request.mock.calls.some(([path, , options]) => path.endsWith('/git/refs') && (options as { method?: string } | undefined)?.method === 'POST')).toBe(false);
    expect(request.mock.calls.some(([path]) => path.endsWith('/pulls/42'))).toBe(true);
    expect(request.mock.calls.some(([path, , options]) => path.includes('/pulls?') && (options as { method?: string } | undefined)?.method === 'POST')).toBe(false);
  });

  it('returns STALE when finalization targets a source branch different from the live PR head ref', async () => {
    const { service, request } = serviceFor([json(sourcePullRequest())]);
    await expect(service.finalize({ ...finalizeRequest, sourceHeadRef: 'feature/other' } as never)).resolves.toEqual({ status: 'STALE' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('removes a newly created companion ref if freshness changes before PR creation', async () => {
    const stalePullRequest = sourcePullRequest({ head: { sha: sha('f'), ref: sourceHeadRef } });
    const responses = [
      ...readyPrefix(), json({}, 404), json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201), json({ sha: commitSha }, 201),
      ...readyPrefix(), json({}, 404),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }, 201),
      json(stalePullRequest), json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }),
      new Response(null, { status: 204 }),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).resolves.toEqual({ status: 'STALE' });
    expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ method: 'DELETE' });
  });

  it('does not write a branch when the companion PR is already closed during finalization', async () => {
    const closedCompanion = { number: 7, html_url: 'https://github.com/acme/widgets/pull/7', state: 'closed' };
    const { service, request } = serviceFor([json(sourcePullRequest()), json([closedCompanion])]);
    await expect(service.finalize(finalizeRequest as never)).resolves.toEqual({ status: 'EXISTING_PR_CLOSED', number: 7 });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.some(([path, , options]) => path.endsWith('/git/refs') && (options as { method?: string } | undefined)?.method === 'POST')).toBe(false);
    expect(request.mock.calls.some(([path, , options]) => path.includes('/pulls?') && (options as { method?: string } | undefined)?.method === 'POST')).toBe(false);
  });

  it('compensates a newly created ref if post-write freshness verification fails', async () => {
    const responses = [
      ...readyPrefix(), json({}, 404), json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201), json({ sha: commitSha }, 201),
      ...readyPrefix(), json({}, 404),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }, 201),
      json({ message: 'upstream unavailable' }, 500),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }),
      new Response(null, { status: 204 }),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).rejects.toMatchObject({ code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503 });
    expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ method: 'DELETE' });
  });

  it('rechecks and restores an existing companion branch if its PR closes during the ref update', async () => {
    const openCompanion = { number: 7, html_url: 'https://github.com/acme/widgets/pull/7', state: 'open' };
    const closedCompanion = { ...openCompanion, state: 'closed' };
    const previousSha = sha('e');
    const responses = [
      ...readyPrefix(), json({ object: { sha: previousSha } }), json({ tree: { sha: treeSha } }),
      json({ sha: sha('f') }, 201), json({ sha: commitSha }, 201),
      json(sourcePullRequest()), json([]), json([openCompanion]),
      json({ object: { sha: previousSha } }),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }),
      json(sourcePullRequest()), json([closedCompanion]),
      json({ object: { sha: commitSha } }),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: previousSha } }),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).resolves.toEqual({ status: 'EXISTING_PR_CLOSED', number: 7 });
    expect(request.mock.calls.at(-1)?.[2]).toMatchObject({ method: 'PATCH', body: { sha: previousSha, force: true } });
    expect(request.mock.calls.some(([path, , options]) => path.includes('/pulls?') && (options as { method?: string } | undefined)?.method === 'POST')).toBe(false);
  });

  it('does not blindly roll back when an ambiguous ref write cannot be read back', async () => {
    const responses = [
      ...readyPrefix(), json({}, 404), json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201), json({ sha: commitSha }, 201),
      ...readyPrefix(), json({}, 404), json({ message: 'write outcome unknown' }, 500),
      json({ message: 'readback unavailable' }, 500),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).rejects.toMatchObject({ code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503 });
    expect(request.mock.calls.some(([_path, , options]) => (options as { method?: string } | undefined)?.method === 'DELETE')).toBe(false);
  });

  it('does not roll back a ref whose observed SHA changed after the publication write', async () => {
    const stalePullRequest = sourcePullRequest({ head: { sha: sha('f'), ref: sourceHeadRef } });
    const responses = [
      ...readyPrefix(), json({}, 404), json({ tree: { sha: treeSha } }),
      json({ sha: sha('e') }, 201), json({ sha: commitSha }, 201),
      ...readyPrefix(), json({}, 404),
      json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: commitSha } }, 201),
      json(stalePullRequest), json({ ref: 'refs/heads/rag-tests/pr-42-aaaaaaa', object: { sha: sha('f') } }),
    ];
    const { service, request } = serviceFor(responses);
    await expect(service.finalize(finalizeRequest as never)).rejects.toMatchObject({ code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503 });
    expect(request.mock.calls.some(([_path, , options]) => (options as { method?: string } | undefined)?.method === 'DELETE')).toBe(false);
    expect(request.mock.calls.some(([_path, , options]) => (options as { method?: string } | undefined)?.method === 'PATCH')).toBe(false);
  });

  it('maps GitHub failures to the neutral error envelope without retaining upstream body text', async () => {
    const secretLikeText = 'private upstream detail with token ghp_not-for-output';
    const { service } = serviceFor([
      json({ id: 1 }), json({ total_count: 0, check_suites: [] }),
      new Response(JSON.stringify({ message: secretLikeText }), { status: 500 }),
    ]);
    const error = await service.createCheck({
      ...publicationRequest, name: 'check', headSha: sourceHeadSha, conclusion: 'failure', title: 'Failed', summary: 'Summary',
    } as never).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect(error).toMatchObject({ code: 'GITHUB_CHECK_COORDINATION_UNAVAILABLE', status: 503, retryable: true });
    expect((error as Error).message).not.toContain(secretLikeText);
  });
});

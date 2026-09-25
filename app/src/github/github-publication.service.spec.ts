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

function serviceFor(responses: Response[]): { service: GithubPublicationService; request: ReturnType<typeof vi.fn> } {
  const request = vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error('Unexpected GitHub API request');
    return response;
  });
  const appAuth = { getInstallationToken: vi.fn().mockResolvedValue('installation-token') };
  return { service: new GithubPublicationService({ request } as never, appAuth as never), request };
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
  it('creates a completed Check from Core-owned values without reading PR freshness', async () => {
    const { service, request } = serviceFor([json({ id: 99 }, 201)]);
    await service.createCheck({
      ...publicationRequest,
      name: 'RAG validation',
      headSha: sourceHeadSha,
      conclusion: 'success',
      title: 'Passed',
      summary: 'Analysis complete.',
      detailsUrl: 'https://app.example/runs/1',
    } as never);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/repos/acme/widgets/check-runs');
    expect(request.mock.calls[0][2]).toMatchObject({
      method: 'POST',
      body: {
        name: 'RAG validation', head_sha: sourceHeadSha, status: 'completed', conclusion: 'success',
        details_url: 'https://app.example/runs/1', output: { title: 'Passed', summary: 'Analysis complete.' },
      },
    });
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
    const { service } = serviceFor([new Response(JSON.stringify({ message: secretLikeText }), { status: 500 })]);
    const error = await service.createCheck({
      ...publicationRequest, name: 'check', headSha: sourceHeadSha, conclusion: 'failure', title: 'Failed', summary: 'Summary',
    } as never).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect(error).toMatchObject({ code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503, retryable: true });
    expect((error as Error).message).not.toContain(secretLikeText);
  });
});

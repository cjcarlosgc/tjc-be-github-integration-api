import { describe, expect, it, vi } from 'vitest';
import { GithubApiError } from './errors.js';
import { GithubRepositoryContentService } from './github-repository-content.service.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serviceFor(api: { request: ReturnType<typeof vi.fn> }, auth: { getInstallationToken: ReturnType<typeof vi.fn> } = {
  getInstallationToken: vi.fn().mockResolvedValue('installation-token'),
}): GithubRepositoryContentService {
  return new GithubRepositoryContentService(api as never, auth as never);
}

describe('GithubRepositoryContentService', () => {
  it('returns all compare files reported on page one without paging the commit list', async () => {
    const files = Array.from({ length: 150 }, (_, index) => ({ filename: `src/${index}.ts`, status: 'modified' }));
    files[149] = { filename: 'src/new.ts', status: 'renamed', previous_filename: 'src/old.ts' };
    const api = { request: vi.fn().mockResolvedValue(json({ files, commits: Array(100).fill({ sha: 'commit' }) })) };
    const service = serviceFor(api);

    const result = await service.compare('13', 'acme/widgets', 'base-sha', 'head-sha');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.value.files).toHaveLength(150);
      expect(result.value.files.at(-1)).toEqual({ filename: 'src/new.ts', status: 'renamed', previousFilename: 'src/old.ts' });
    }
    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request).toHaveBeenCalledWith(
      '/repos/acme/widgets/compare/base-sha...head-sha?per_page=100&page=1', 'installation-token');
  });

  it('returns unverifiable at GitHub’s 300-file ceiling because completeness is ambiguous', async () => {
    const cappedFiles = Array.from({ length: 300 }, (_, index) => ({ filename: `src/${index}.ts`, status: 'modified' }));
    const api = { request: vi.fn().mockResolvedValue(json({ files: cappedFiles })) };
    const service = serviceFor(api);
    await expect(service.compare('13', 'acme/widgets', 'base', 'head')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('does not return files when compare fails, times out, or has an invalid response', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({}, 503)) };
    const service = serviceFor(api);
    await expect(service.compare('13', 'acme/widgets', 'base', 'head')).resolves.toEqual({ status: 'UNVERIFIABLE' });

    api.request.mockResolvedValueOnce(json({ files: [{ filename: 'broken.ts', status: 'future-status' }] }));
    await expect(service.compare('13', 'acme/widgets', 'base', 'head')).resolves.toEqual({ status: 'UNVERIFIABLE' });

    api.request.mockRejectedValueOnce(new Error('simulated timeout'));
    await expect(service.compare('13', 'acme/widgets', 'base', 'head')).resolves.toEqual({ status: 'UNVERIFIABLE' });

    api.request.mockResolvedValueOnce(new Response('not-json', { status: 200 }));
    await expect(service.compare('13', 'acme/widgets', 'base', 'head')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('preserves a truncated recursive tree while returning blob paths only', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({
      truncated: true,
      tree: [{ path: 'src', type: 'tree' }, { path: 'src/index.ts', type: 'blob' }],
    })) };
    const service = serviceFor(api);

    await expect(service.getTree('13', 'acme/widgets', 'commit-sha')).resolves.toEqual({
      status: 'OK', value: { paths: ['src/index.ts'], truncated: true },
    });
    expect(api.request).toHaveBeenCalledWith('/repos/acme/widgets/git/trees/commit-sha?recursive=1', 'installation-token');
  });

  it('treats malformed tree structure as unverifiable', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({ truncated: 'false', tree: [] })) };
    await expect(serviceFor(api).getTree('13', 'acme/widgets', 'commit-sha')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('reads each file at the requested commit and normalizes base64 whitespace', async () => {
    const api = { request: vi.fn().mockResolvedValueOnce(json({ encoding: 'base64', content: 'YQ==\n' })) };
    const service = serviceFor(api);

    await expect(service.getFilesBatch('13', 'acme/widgets', 'commit-sha', ['src/a file.ts'])).resolves.toEqual({
      status: 'OK', value: { files: [{ path: 'src/a file.ts', contentBase64: 'YQ==' }] },
    });
    expect(api.request).toHaveBeenCalledWith(
      '/repos/acme/widgets/contents/src/a%20file.ts?ref=commit-sha', 'installation-token',
    );
  });

  it('fails the entire file batch if any requested file cannot be read', async () => {
    const api = { request: vi.fn()
      .mockResolvedValueOnce(json({ encoding: 'base64', content: 'YQ==' }))
      .mockResolvedValueOnce(json({}, 404)) };
    const service = serviceFor(api);
    await expect(service.getFilesBatch('13', 'acme/widgets', 'commit-sha', ['a.ts', 'missing.ts']))
      .resolves.toEqual({ status: 'NOT_FOUND' });
    expect(api.request).toHaveBeenCalledTimes(2);

    api.request.mockResolvedValueOnce(json({ encoding: 'none', content: '' }));
    await expect(service.getFilesBatch('13', 'acme/widgets', 'commit-sha', ['large.bin']))
      .resolves.toEqual({ status: 'UNVERIFIABLE' });

    const timeoutApi = { request: vi.fn()
      .mockResolvedValueOnce(json({ encoding: 'base64', content: 'YQ==' }))
      .mockRejectedValueOnce(new Error('simulated timeout')) };
    await expect(serviceFor(timeoutApi).getFilesBatch('13', 'acme/widgets', 'commit-sha', ['a.ts', 'b.ts']))
      .resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('returns the current pull request head and state, rejecting malformed upstream data', async () => {
    const api = { request: vi.fn().mockResolvedValueOnce(json({ head: { sha: 'current-sha' }, state: 'closed' })) };
    const service = serviceFor(api);
    await expect(service.getPullRequestHead('13', 'acme/widgets', 42)).resolves.toEqual({
      status: 'OK', value: { headSha: 'current-sha', state: 'closed' },
    });
    expect(api.request).toHaveBeenCalledWith('/repos/acme/widgets/pulls/42', 'installation-token');

    api.request.mockResolvedValueOnce(json({ head: {}, state: 'merged' }));
    await expect(service.getPullRequestHead('13', 'acme/widgets', 42)).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('preserves 404, revoked-installation, and network uncertainty distinctions', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({}, 404)) };
    const service = serviceFor(api);
    await expect(service.getPullRequestHead('13', 'acme/widgets', 42)).resolves.toEqual({ status: 'NOT_FOUND' });

    const revoked = serviceFor({ request: vi.fn() }, { getInstallationToken: vi.fn().mockRejectedValue(new GithubApiError(404)) });
    await expect(revoked.getTree('13', 'acme/widgets', 'commit-sha')).resolves.toEqual({ status: 'NOT_INSTALLED' });

    const uncertain = serviceFor({ request: vi.fn() }, { getInstallationToken: vi.fn().mockRejectedValue(new Error('secret-bearing error')) });
    await expect(uncertain.getTree('13', 'acme/widgets', 'commit-sha')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });
});

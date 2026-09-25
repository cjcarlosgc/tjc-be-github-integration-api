import { Injectable } from '@nestjs/common';
import { GithubApiClient, readJson } from './github-api.client.js';
import { GithubApiError } from './errors.js';
import { GithubAppAuthService, repositoryPath } from './github-app-auth.service.js';
import type { GithubLookup } from './github-access.service.js';

const COMPARE_COMMIT_PAGE_SIZE = 100;
const COMPARE_MAX_CHANGED_FILES = 300;
const compareStatuses = new Set(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']);

export interface CompareFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  previousFilename?: string;
}

export interface PullRequestHead {
  headSha: string;
  state: 'open' | 'closed';
}

interface InstallationToken {
  status: 'OK';
  token: string;
}

type TokenLookup = InstallationToken | { status: 'NOT_INSTALLED' } | { status: 'UNVERIFIABLE' };

@Injectable()
export class GithubRepositoryContentService {
  constructor(
    private readonly api: GithubApiClient,
    private readonly appAuth: GithubAppAuthService,
  ) {}

  async compare(
    installationId: string,
    repositoryName: string,
    baseSha: string,
    headSha: string,
  ): Promise<GithubLookup<{ files: CompareFile[] }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;

    // GitHub paginates commits here; changed files are returned only on page 1,
    // with an undocumented completeness signal beyond the 300-file ceiling.
    const result = await this.getLookup<unknown>(
      `/repos/${repositoryPath(repositoryName)}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(headSha)}?per_page=${COMPARE_COMMIT_PAGE_SIZE}&page=1`,
      token.token,
    );
    if (result.status !== 'OK') return result;

    const pageFiles = isRecord(result.value) ? result.value.files : undefined;
    if (!Array.isArray(pageFiles) || pageFiles.length >= COMPARE_MAX_CHANGED_FILES) return { status: 'UNVERIFIABLE' };
    const files = pageFiles.map(normalizeCompareFile);
    if (files.some((file) => file === null)) return { status: 'UNVERIFIABLE' };
    return { status: 'OK', value: { files: files as CompareFile[] } };
  }

  async getTree(
    installationId: string,
    repositoryName: string,
    commitSha: string,
  ): Promise<GithubLookup<{ paths: string[]; truncated: boolean }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;

    const result = await this.getLookup<unknown>(
      `/repos/${repositoryPath(repositoryName)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`,
      token.token,
    );
    if (result.status !== 'OK') return result;
    if (!isRecord(result.value) || !Array.isArray(result.value.tree) || typeof result.value.truncated !== 'boolean') {
      return { status: 'UNVERIFIABLE' };
    }

    const entries = result.value.tree;
    if (entries.some((entry) => !isRecord(entry) || typeof entry.path !== 'string' || typeof entry.type !== 'string')) {
      return { status: 'UNVERIFIABLE' };
    }
    return {
      status: 'OK',
      value: {
        paths: entries.filter((entry) => entry.type === 'blob').map((entry) => (entry as { path: string }).path),
        truncated: result.value.truncated,
      },
    };
  }

  async getFilesBatch(
    installationId: string,
    repositoryName: string,
    commitSha: string,
    paths: string[],
  ): Promise<GithubLookup<{ files: Array<{ path: string; contentBase64: string }> }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;

    const files: Array<{ path: string; contentBase64: string }> = [];
    for (const path of paths) {
      const encodedPath = path.split('/').map((part) => encodeURIComponent(part)).join('/');
      const result = await this.getLookup<unknown>(
        `/repos/${repositoryPath(repositoryName)}/contents/${encodedPath}?ref=${encodeURIComponent(commitSha)}`,
        token.token,
      );
      if (result.status !== 'OK') return result;

      const contentBase64 = normalizeBase64Content(result.value);
      if (contentBase64 === null) return { status: 'UNVERIFIABLE' };
      files.push({ path, contentBase64 });
    }
    return { status: 'OK', value: { files } };
  }

  async getPullRequestHead(
    installationId: string,
    repositoryName: string,
    pullRequestNumber: number,
  ): Promise<GithubLookup<PullRequestHead>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;

    const result = await this.getLookup<unknown>(
      `/repos/${repositoryPath(repositoryName)}/pulls/${pullRequestNumber}`,
      token.token,
    );
    if (result.status !== 'OK') return result;
    if (!isRecord(result.value) || !isRecord(result.value.head) || typeof result.value.head.sha !== 'string' ||
      (result.value.state !== 'open' && result.value.state !== 'closed')) {
      return { status: 'UNVERIFIABLE' };
    }
    return { status: 'OK', value: { headSha: result.value.head.sha, state: result.value.state } };
  }

  private async getInstallationToken(installationId: string): Promise<TokenLookup> {
    try {
      return { status: 'OK', token: await this.appAuth.getInstallationToken(installationId) };
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) return { status: 'NOT_INSTALLED' };
      return { status: 'UNVERIFIABLE' };
    }
  }

  private async getLookup<T>(path: string, token: string): Promise<GithubLookup<T>> {
    try {
      const response = await this.api.request(path, token);
      if (response.status === 404) return { status: 'NOT_FOUND' };
      if (!response.ok) return { status: 'UNVERIFIABLE' };
      const body = await readJson<T>(response);
      return body === null ? { status: 'UNVERIFIABLE' } : { status: 'OK', value: body };
    } catch {
      return { status: 'UNVERIFIABLE' };
    }
  }
}

function normalizeCompareFile(value: unknown): CompareFile | null {
  if (!isRecord(value) || typeof value.filename !== 'string' || !value.filename ||
    typeof value.status !== 'string' || !compareStatuses.has(value.status)) return null;
  if (value.previous_filename !== undefined && (typeof value.previous_filename !== 'string' || !value.previous_filename)) return null;
  return {
    filename: value.filename,
    status: value.status as CompareFile['status'],
    ...(typeof value.previous_filename === 'string' ? { previousFilename: value.previous_filename } : {}),
  };
}

function normalizeBase64Content(value: unknown): string | null {
  if (!isRecord(value) || value.encoding !== 'base64' || typeof value.content !== 'string') return null;
  const content = value.content.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) return null;
  return Buffer.from(content, 'base64').toString('base64') === content ? content : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

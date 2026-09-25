import { Inject, Injectable } from '@nestjs/common';
import { correlationIdStorage } from '../correlation-id.middleware.js';
import { GithubApiError } from './errors.js';

export const GITHUB_FETCH = Symbol('GITHUB_FETCH');
export type GithubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const API_BASE_URL = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_REQUEST_TIMEOUT_MS = 180_000;

@Injectable()
export class GithubApiClient {
  constructor(@Inject(GITHUB_FETCH) private readonly fetcher: GithubFetch) {}

  async request(
    path: string,
    token: string,
    options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; timeoutMs?: number } = {},
  ): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': API_VERSION,
          'User-Agent': 'TJC-GitHub-Integration',
          ...(correlationIdStorage.getStore() ? { 'X-Correlation-ID': correlationIdStorage.getStore() } : {}),
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: AbortSignal.timeout(Math.min(MAX_REQUEST_TIMEOUT_MS, options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS)),
      });
    } catch {
      // Do not keep the original exception: fetch errors can contain request URLs or headers.
      throw new GithubApiError(null);
    }

    return response;
  }
}

export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

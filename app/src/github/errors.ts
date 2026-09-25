export type InternalGithubErrorCode =
  | 'INVALID_REQUEST'
  | 'SERVICE_UNAUTHORIZED'
  | 'GITHUB_USER_TOKEN_INVALID'
  | 'GITHUB_RESOURCE_NOT_FOUND'
  | 'GITHUB_APP_CONFIGURATION_UNAVAILABLE'
  | 'GITHUB_UPSTREAM_UNAVAILABLE'
  | 'INVALID_WEBHOOK_SIGNATURE'
  | 'GITHUB_WEBHOOK_UNAVAILABLE'
  | 'CORE_WEBHOOK_UNAVAILABLE';

export class GithubIntegrationError extends Error {
  constructor(
    public readonly code: InternalGithubErrorCode,
    message: string,
    public readonly status: 400 | 401 | 404 | 413 | 503,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GithubIntegrationError';
  }
}

/** Status only; never retain or expose a GitHub response body or token. */
export class GithubApiError extends Error {
  constructor(public readonly status: number | null) {
    super('GitHub API request failed.');
    this.name = 'GithubApiError';
  }
}

export function upstreamUnavailable(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_UPSTREAM_UNAVAILABLE',
    'GitHub could not verify the requested operation; retry later.',
    503,
    true,
  );
}

export function appConfigurationUnavailable(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_APP_CONFIGURATION_UNAVAILABLE',
    'GitHub App configuration is unavailable.',
    503,
    false,
  );
}

export function invalidRequest(): GithubIntegrationError {
  return new GithubIntegrationError(
    'INVALID_REQUEST',
    'The request is invalid.',
    400,
    false,
  );
}

export function invalidWebhookSignature(): GithubIntegrationError {
  return new GithubIntegrationError(
    'INVALID_WEBHOOK_SIGNATURE',
    'The GitHub webhook signature is invalid.',
    401,
    false,
  );
}

export function webhookUnavailable(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_WEBHOOK_UNAVAILABLE',
    'GitHub webhook delivery is not configured.',
    503,
    false,
  );
}

export function coreWebhookUnavailable(): GithubIntegrationError {
  return new GithubIntegrationError(
    'CORE_WEBHOOK_UNAVAILABLE',
    'Core could not accept the GitHub webhook; retry later.',
    503,
    true,
  );
}

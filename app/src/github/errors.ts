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

export type PublicGithubErrorCode =
  | 'AUTH_REQUIRED'
  | 'GITHUB_ACCOUNT_REQUIRED'
  | 'INVALID_ACCESS_TOKEN'
  | 'GITHUB_IDENTITY_REQUIRED'
  | 'IDENTITY_UNAVAILABLE'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_ROLE_INSUFFICIENT'
  | 'GITHUB_APP_ACCESS_REQUIRED'
  | 'REPOSITORY_PERMISSION_INSUFFICIENT'
  | 'GITHUB_REPOSITORY_NOT_FOUND'
  | 'INTEGRATION_BRANCH_NOT_FOUND'
  | 'GITHUB_ACCESS_DENIED'
  | 'CORE_AUTHORIZATION_UNAVAILABLE';

export class GithubIntegrationError extends Error {
  constructor(
    public readonly code: InternalGithubErrorCode | PublicGithubErrorCode,
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 413 | 503,
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

export function coreAuthorizationUnavailable(): GithubIntegrationError {
  return new GithubIntegrationError(
    'CORE_AUTHORIZATION_UNAVAILABLE',
    'Core could not authorize this GitHub operation; retry later.',
    503,
    true,
  );
}

export function githubAccessDenied(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_ACCESS_DENIED',
    'Core denied this GitHub operation.',
    403,
    false,
  );
}

export function githubAccountRequired(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_ACCOUNT_REQUIRED',
    'Renueva tu acceso a GitHub para continuar.',
    401,
    false,
  );
}

export function githubAppAccessRequired(): GithubIntegrationError {
  return new GithubIntegrationError(
    'GITHUB_APP_ACCESS_REQUIRED',
    'The GitHub App does not have access to this repository.',
    403,
    false,
  );
}

export function repositoryPermissionInsufficient(): GithubIntegrationError {
  return new GithubIntegrationError(
    'REPOSITORY_PERMISSION_INSUFFICIENT',
    'The GitHub user needs maintain, write, or admin permission on this repository.',
    403,
    false,
  );
}

export function integrationBranchNotFound(): GithubIntegrationError {
  return new GithubIntegrationError(
    'INTEGRATION_BRANCH_NOT_FOUND',
    'The selected integration branch is unavailable.',
    404,
    false,
  );
}

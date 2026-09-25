import { invalidRequest } from '../github/errors.js';
import type { NormalizedWebhookData, NormalizedWebhookEvent } from './github-webhook.types.js';

type JsonObject = Record<string, unknown>;

const knownKinds: Record<string, NormalizedWebhookData['kind']> = {
  pull_request: 'PULL_REQUEST',
  installation: 'INSTALLATION',
  installation_repositories: 'INSTALLATION_REPOSITORIES',
  repository: 'REPOSITORY',
  member: 'MEMBER',
  membership: 'MEMBERSHIP',
  organization: 'ORGANIZATION',
  team: 'TEAM',
};

export function normalizeGithubWebhook(
  deliveryId: string,
  eventName: string,
  payload: unknown,
  receivedAt = new Date(),
): NormalizedWebhookEvent {
  if (!isDeliveryId(deliveryId) || !isEventName(eventName)) throw invalidRequest();
  const root = object(payload);
  const rawAction = root.action;
  const action = rawAction === undefined || rawAction === null ? null : string(rawAction);
  const data = normalizeData(eventName, root);

  return {
    schemaVersion: 1,
    deliveryId,
    eventName,
    action,
    receivedAt: receivedAt.toISOString(),
    data,
  };
}

function normalizeData(eventName: string, root: JsonObject): NormalizedWebhookData {
  switch (knownKinds[eventName]) {
    case 'PULL_REQUEST':
      return normalizePullRequest(root);
    case 'INSTALLATION':
      return normalizeInstallation(root);
    case 'INSTALLATION_REPOSITORIES':
      return normalizeInstallationRepositories(root);
    case 'REPOSITORY':
      return normalizeRepository(root);
    case 'MEMBER':
      return {
        kind: 'MEMBER',
        memberId: optionalNestedId(root, 'member', 'id'),
        repositoryId: optionalNestedId(root, 'repository', 'id'),
      };
    case 'MEMBERSHIP':
      return {
        kind: 'MEMBERSHIP',
        memberId: optionalNestedId(root, 'member', 'id'),
        organizationId: optionalNestedId(root, 'organization', 'id'),
      };
    case 'ORGANIZATION': {
      const organization = optionalObject(root.organization);
      const membership = optionalObject(root.membership);
      const user = membership ? optionalObject(membership.user) : null;
      return {
        kind: 'ORGANIZATION',
        organizationId: organization ? optionalId(organization.id) : null,
        organizationLogin: organization ? optionalString(organization.login) : null,
        membershipUserId: user ? optionalId(user.id) : null,
      };
    }
    case 'TEAM':
      return {
        kind: 'TEAM',
        repositoryId: optionalNestedId(root, 'repository', 'id'),
        organizationId: optionalNestedId(root, 'organization', 'id'),
      };
    default:
      return { kind: 'IGNORED' };
  }
}

function normalizePullRequest(root: JsonObject): NormalizedWebhookData {
  const repository = object(root.repository);
  const pullRequest = object(root.pull_request);
  const base = object(pullRequest.base);
  const head = object(pullRequest.head);
  const user = optionalObject(pullRequest.user);
  return {
    kind: 'PULL_REQUEST',
    repository: { id: requiredId(repository.id), fullName: requiredString(repository.full_name) },
    installationId: optionalNestedId(root, 'installation', 'id'),
    pullRequestNumber: positiveInteger(root.number),
    pullRequest: {
      title: requiredString(pullRequest.title),
      draft: boolean(pullRequest.draft),
      merged: boolean(pullRequest.merged),
      base: { ref: requiredString(base.ref), sha: requiredString(base.sha) },
      head: { ref: requiredString(head.ref), sha: requiredString(head.sha) },
      userLogin: user ? optionalString(user.login) : null,
    },
  };
}

function normalizeInstallation(root: JsonObject): NormalizedWebhookData {
  const installation = object(root.installation);
  const account = optionalObject(installation.account);
  return {
    kind: 'INSTALLATION',
    installationId: requiredId(installation.id),
    account: {
      id: account ? optionalId(account.id) : null,
      type: account ? optionalString(account.type) : null,
    },
  };
}

function normalizeInstallationRepositories(root: JsonObject): NormalizedWebhookData {
  const installation = object(root.installation);
  return {
    kind: 'INSTALLATION_REPOSITORIES',
    installationId: requiredId(installation.id),
    added: repositoryList(root.repositories_added),
    removed: repositoryList(root.repositories_removed),
  };
}

function normalizeRepository(root: JsonObject): NormalizedWebhookData {
  const repository = object(root.repository);
  const owner = optionalObject(repository.owner);
  const ownerId = owner ? optionalId(owner.id) : null;
  return {
    kind: 'REPOSITORY',
    repository: {
      id: requiredId(repository.id),
      fullName: requiredString(repository.full_name),
      owner: owner && ownerId !== null
        ? { id: ownerId, login: optionalString(owner.login), type: optionalString(owner.type) }
        : null,
    },
    installationId: optionalNestedId(root, 'installation', 'id'),
  };
}

function repositoryList(value: unknown): Array<{ id: string; fullName: string }> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalidRequest();
  return value.map((entry) => {
    const repository = object(entry);
    return { id: requiredId(repository.id), fullName: requiredString(repository.full_name) };
  });
}

function optionalNestedId(root: JsonObject, objectKey: string, idKey: string): string | null {
  const nested = optionalObject(root[objectKey]);
  return nested ? optionalId(nested[idKey]) : null;
}

function object(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalidRequest();
  return value as JsonObject;
}

function optionalObject(value: unknown): JsonObject | null {
  if (value === undefined || value === null) return null;
  return object(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw invalidRequest();
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return string(value);
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw invalidRequest();
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw invalidRequest();
  return value;
}

function requiredId(value: unknown): string {
  const id = optionalId(value);
  if (id === null) throw invalidRequest();
  return id;
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  throw invalidRequest();
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw invalidRequest();
  return value;
}

function isEventName(value: string): boolean {
  return value.length > 0 && value.length <= 100 && !containsControlCharacter(value);
}

function isDeliveryId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && !containsControlCharacter(value);
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 0x20 || code === 0x7f;
  });
}

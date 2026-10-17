import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { GithubApiClient, readJson } from './github-api.client.js';
import { GithubAppAuthService, repositoryPath } from './github-app-auth.service.js';
import { checkCoordinationUnavailable, checkCreateRejected, checkIdentityAmbiguous, GithubApiError, GithubIntegrationError, invalidRequest, upstreamUnavailable } from './errors.js';
import { CheckCoordinationStore, type CheckIdentity, type CheckState } from './check-coordination.store.js';
import type {
  CompanionPullRequestRequestDto,
  GithubCheckRequestDto,
  PublicationProposalBlobRequestDto,
  PublicationRequestDto,
} from './github.dto.js';

type PublicationResult =
  | { status: 'READY' }
  | { status: 'STALE' }
  | { status: 'EXISTING_PR_CLOSED'; number: number };

interface PullRequestSummary {
  number: number;
  url: string;
  state: 'open' | 'closed';
}

interface SourcePullRequest {
  headSha: string;
  headRef: string;
  baseRef: string;
  state: 'open' | 'closed';
}

interface PublicationState {
  result: PublicationResult;
  companionPullRequest: PullRequestSummary | null;
  source: SourcePullRequest | null;
}

interface BranchReference {
  sha: string;
}

const shaPattern = /^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;
const maxProposalBytes = 100_000_000;
const maxProposalBase64Length = 4 * Math.ceil(maxProposalBytes / 3);
const proposalBlobRequestTimeoutMs = 180_000;
const pathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*(?:^|\/)\.(?:\/|$))(?!.*\/\/)[^\\]+$/;
const forbiddenBranchCharacters = new Set([' ', '~', '^', ':', '?', '*', '[', '\\']);
const checkPageSize = 100;
const maxCheckPages = 1000;

interface GithubCheckRun {
  id?: unknown;
  name?: unknown;
  head_sha?: unknown;
  app?: { id?: unknown } | null;
}

interface GithubCheckSuite {
  id?: unknown;
  head_sha?: unknown;
  app?: { id?: unknown } | null;
}

@Injectable()
export class GithubPublicationService {
  constructor(
    private readonly api: GithubApiClient,
    private readonly appAuth: GithubAppAuthService,
    private readonly checkCoordination: CheckCoordinationStore,
  ) {}

  async createCheck(input: GithubCheckRequestDto): Promise<{ checkId: string }> {
    const token = await this.installationToken(input.installationId);
    const appId = this.appAuth.getConfiguredAppId();
    const repository = await this.getRepositoryIdentity(input.repositoryName, token);
    const identity: CheckIdentity = { repositoryId: repository.id, appId, headSha: input.headSha, name: input.name };
    const requestHash = checkRequestHash(input);
    const reservation = await this.checkCoordination.claim(identity, requestHash);
    let state = reservation.state;
    let checkId = reservation.checkId;

    if (state === 'CREATE_REJECTED') throw checkCreateRejected();

    // Every request reconciles the complete remote identity while holding the
    // process-local mutex, including ACTIVE reservations with a saved checkId.
    let candidates: string[];
    try {
      candidates = await this.findCheckCandidates(input, appId, token);
    } catch {
      await this.releaseUncertain(identity, reservation.leaseToken, state, requestHash, checkId);
      throw checkCoordinationUnavailable();
    }
    if (candidates.length > 1) {
      await this.checkCoordination.transition(identity, reservation.leaseToken, 'AMBIGUOUS', requestHash, null);
      throw checkIdentityAmbiguous();
    }

    if (state === 'UPDATE_UNKNOWN') {
      if (candidates.length === 0 || !checkId || !(await this.checkMatches(input, candidates[0]!, token))) {
        await this.releaseUncertain(identity, reservation.leaseToken, state, requestHash, checkId);
        throw checkCoordinationUnavailable();
      }
      checkId = candidates[0]!;
      await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId);
      return { checkId };
    }

    if (state === 'CREATE_UNKNOWN' || state === 'RECONCILIATION_REQUIRED' || state === 'RESERVED') {
      if (candidates.length === 1) {
        checkId = candidates[0]!;
        await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId, false);
        state = 'ACTIVE';
      } else if (state === 'CREATE_UNKNOWN' || state === 'RECONCILIATION_REQUIRED') {
        await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
        throw checkCoordinationUnavailable();
      } else {
        await this.checkCoordination.transition(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null, false);
        let response: Response;
        try {
          response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/check-runs`, token, {
            method: 'POST', body: checkRunBody(input),
          });
        } catch {
          await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
          throw checkCoordinationUnavailable();
        }
        if (response.status === 422) {
          let rejectedCandidates: string[];
          try {
            rejectedCandidates = await this.findCheckCandidates(input, appId, token);
          } catch {
            await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
            throw checkCoordinationUnavailable();
          }
          if (rejectedCandidates.length > 1) {
            await this.checkCoordination.transition(identity, reservation.leaseToken, 'AMBIGUOUS', requestHash, null);
            throw checkIdentityAmbiguous();
          }
          if (rejectedCandidates.length === 1) {
            checkId = rejectedCandidates[0]!;
            try {
              await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId, false);
              state = 'ACTIVE';
            } catch {
              await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, checkId);
              throw checkCoordinationUnavailable();
            }
          } else {
            try {
              await this.checkCoordination.transition(identity, reservation.leaseToken, 'CREATE_REJECTED', requestHash, null);
            } catch {
              await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
              throw checkCoordinationUnavailable();
            }
            throw checkCreateRejected();
          }
        }
        if (response.status !== 422) {
          try {
            const data = await this.requireJson<{ id?: unknown }>(response);
            checkId = normalizeCheckId(data.id);
            await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId);
            return { checkId };
          } catch {
            await this.releaseUncertain(identity, reservation.leaseToken, 'CREATE_UNKNOWN', requestHash, null);
            throw checkCoordinationUnavailable();
          }
        }
      }
    } else if (state === 'ACTIVE') {
      if (candidates.length === 0) {
        await this.checkCoordination.transition(identity, reservation.leaseToken, 'RECONCILIATION_REQUIRED', requestHash, checkId);
        throw checkCoordinationUnavailable();
      }
      checkId = candidates[0]!;
      if (checkId !== reservation.checkId) {
        await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId, false);
      }
    }

    if (!checkId) throw checkCoordinationUnavailable();
    await this.checkCoordination.transition(identity, reservation.leaseToken, 'UPDATE_UNKNOWN', requestHash, checkId, false);
    try {
      const response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/check-runs/${checkId}`, token, {
        method: 'PATCH', body: checkRunBody(input),
      });
      const data = await this.requireJson<{ id?: unknown }>(response);
      if (normalizeCheckId(data.id) !== checkId) throw checkCoordinationUnavailable();
      await this.checkCoordination.transition(identity, reservation.leaseToken, 'ACTIVE', requestHash, checkId);
      return { checkId };
    } catch (error) {
      if (error instanceof GithubIntegrationError && error.code === 'GITHUB_RESOURCE_NOT_FOUND' && error.status === 404) {
        return this.reconcileMissingCheckId(input, appId, token, identity, reservation.leaseToken, requestHash, checkId);
      }
      await this.releaseUncertain(identity, reservation.leaseToken, 'UPDATE_UNKNOWN', requestHash, checkId);
      throw checkCoordinationUnavailable();
    }
  }

  private async reconcileMissingCheckId(
    input: GithubCheckRequestDto,
    appId: string,
    token: string,
    identity: CheckIdentity,
    fencingToken: string,
    requestHash: string,
    missingCheckId: string,
  ): Promise<{ checkId: string }> {
    let candidates: string[];
    try {
      candidates = await this.findCheckCandidates(input, appId, token);
    } catch {
      await this.releaseUncertain(identity, fencingToken, 'UPDATE_UNKNOWN', requestHash, missingCheckId);
      throw checkCoordinationUnavailable();
    }

    if (candidates.length > 1) {
      await this.checkCoordination.transition(identity, fencingToken, 'AMBIGUOUS', requestHash, null);
      throw checkIdentityAmbiguous();
    }
    if (candidates.length === 0 || candidates[0] === missingCheckId) {
      await this.checkCoordination.transition(identity, fencingToken, 'RECONCILIATION_REQUIRED', requestHash, missingCheckId);
      throw checkCoordinationUnavailable();
    }

    const repairedCheckId = candidates[0]!;
    await this.checkCoordination.transition(identity, fencingToken, 'ACTIVE', requestHash, repairedCheckId, false);
    await this.checkCoordination.transition(identity, fencingToken, 'UPDATE_UNKNOWN', requestHash, repairedCheckId, false);
    try {
      const response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/check-runs/${repairedCheckId}`, token, {
        method: 'PATCH', body: checkRunBody(input),
      });
      const data = await this.requireJson<{ id?: unknown }>(response);
      if (normalizeCheckId(data.id) !== repairedCheckId) throw checkCoordinationUnavailable();
      await this.checkCoordination.transition(identity, fencingToken, 'ACTIVE', requestHash, repairedCheckId);
      return { checkId: repairedCheckId };
    } catch (error) {
      if (error instanceof GithubIntegrationError && error.code === 'GITHUB_RESOURCE_NOT_FOUND' && error.status === 404) {
        await this.checkCoordination.transition(identity, fencingToken, 'RECONCILIATION_REQUIRED', requestHash, repairedCheckId);
        throw checkCoordinationUnavailable();
      }
      await this.releaseUncertain(identity, fencingToken, 'UPDATE_UNKNOWN', requestHash, repairedCheckId);
      throw checkCoordinationUnavailable();
    }
  }

  private async checkMatches(input: GithubCheckRequestDto, checkId: string, token: string): Promise<boolean> {
    try {
      const response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/check-runs/${checkId}`, token);
      const data = await this.requireJson<{
        id?: unknown; name?: unknown; head_sha?: unknown; app?: { id?: unknown } | null;
        status?: unknown; conclusion?: unknown; output?: { title?: unknown; summary?: unknown } | null;
        details_url?: unknown;
      }>(response);
      return normalizeCheckId(data.id) === checkId && data.name === input.name && data.head_sha === input.headSha &&
        String(data.app?.id) === this.appAuth.getConfiguredAppId() && data.status === 'completed' &&
        data.conclusion === input.conclusion && data.output?.title === input.title && data.output?.summary === input.summary &&
        (input.detailsUrl === undefined || data.details_url === input.detailsUrl);
    } catch {
      return false;
    }
  }

  private async releaseUncertain(identity: CheckIdentity, token: string, state: CheckState, requestHash: string, checkId: string | null): Promise<void> {
    await this.checkCoordination.transition(identity, token, state, requestHash, checkId).catch(() => undefined);
  }

  private async getRepositoryIdentity(repositoryName: string, token: string): Promise<{ id: string }> {
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}`, token);
    const data = await this.requireJson<{ id?: unknown }>(response);
    if (!Number.isSafeInteger(data.id) || (data.id as number) <= 0) throw upstreamUnavailable();
    return { id: String(data.id) };
  }

  private async findCheckCandidates(input: GithubCheckRequestDto, appId: string, token: string): Promise<string[]> {
    const basePath = `/repos/${repositoryPath(input.repositoryName)}`;
    const suitesPath = `${basePath}/commits/${encodeURIComponent(input.headSha)}/check-suites`;
    const suiteIds: string[] = [];
    let expectedSuiteCount: number | null = null;
    let traversedSuiteCount = 0;
    for (let page = 1; page <= maxCheckPages; page += 1) {
      const response = await this.request(`${suitesPath}?app_id=${encodeURIComponent(appId)}&per_page=${checkPageSize}&page=${page}`, token);
      const data = await this.requireJson<{ total_count?: unknown; check_suites?: unknown }>(response);
      if (!Number.isSafeInteger(data.total_count) || (data.total_count as number) < 0 || !Array.isArray(data.check_suites) || data.check_suites.length > checkPageSize) {
        throw upstreamUnavailable();
      }
      if (expectedSuiteCount === null) expectedSuiteCount = data.total_count as number;
      else if (expectedSuiteCount !== data.total_count) throw upstreamUnavailable();
      traversedSuiteCount += data.check_suites.length;
      for (const raw of data.check_suites as GithubCheckSuite[]) {
        if (!Number.isSafeInteger(raw?.id) || (raw.id as number) <= 0 || raw.head_sha !== input.headSha || String(raw.app?.id) !== appId) {
          throw upstreamUnavailable();
        }
        suiteIds.push(String(raw.id));
      }
      if (data.check_suites.length < checkPageSize) {
        if (traversedSuiteCount !== expectedSuiteCount) throw upstreamUnavailable();
        break;
      }
      if (page === maxCheckPages) throw upstreamUnavailable();
    }

    const candidates = new Map<string, true>();
    for (const suiteId of suiteIds) {
      const path = `${basePath}/check-suites/${suiteId}/check-runs`;
      const query = `check_name=${encodeURIComponent(input.name)}&filter=all&per_page=${checkPageSize}`;
      let expectedCount: number | null = null;
      let traversedCount = 0;
      for (let page = 1; page <= maxCheckPages; page += 1) {
        const response = await this.request(`${path}?${query}&page=${page}`, token);
        const data = await this.requireJson<{ total_count?: unknown; check_runs?: unknown }>(response);
        if (!Number.isSafeInteger(data.total_count) || (data.total_count as number) < 0 || !Array.isArray(data.check_runs) || data.check_runs.length > checkPageSize) {
          throw upstreamUnavailable();
        }
        if (expectedCount === null) expectedCount = data.total_count as number;
        else if (expectedCount !== data.total_count) throw upstreamUnavailable();
        traversedCount += data.check_runs.length;
        for (const raw of data.check_runs as GithubCheckRun[]) {
          const checkId = normalizeCheckId(raw?.id);
          if (raw.name !== input.name || raw.head_sha !== input.headSha || String(raw.app?.id) !== appId) continue;
          candidates.set(checkId, true);
        }
        if (data.check_runs.length < checkPageSize) {
          if (traversedCount !== expectedCount) throw upstreamUnavailable();
          break;
        }
        if (page === maxCheckPages) throw upstreamUnavailable();
      }
    }
    return [...candidates.keys()];
  }

  async preflight(input: PublicationRequestDto): Promise<PublicationResult> {
    const token = await this.installationToken(input.installationId);
    return (await this.inspectPublication(input, token)).result;
  }

  async uploadProposalBlob(input: PublicationProposalBlobRequestDto): Promise<
    | { status: 'UPLOADED'; path: string; blobSha: string }
    | Exclude<PublicationResult, { status: 'READY' }>
  > {
    validateUtf8Base64(input.contentBase64);
    if (!isSafePath(input.path)) throw invalidRequest();

    const token = await this.installationToken(input.installationId);
    const state = await this.inspectPublication(input, token);
    if (state.result.status !== 'READY') return state.result;

    const response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/git/blobs`, token, {
      method: 'POST',
      body: { content: input.contentBase64, encoding: 'base64' },
      timeoutMs: proposalBlobRequestTimeoutMs,
    });
    const data = await this.requireJson<{ sha?: unknown }>(response);
    if (typeof data.sha !== 'string' || !shaPattern.test(data.sha)) throw upstreamUnavailable();
    return { status: 'UPLOADED', path: input.path, blobSha: data.sha };
  }

  async finalize(input: CompanionPullRequestRequestDto): Promise<
    | { status: 'PUBLISHED'; branchName: string; commitSha: string; pullRequest: { number: number; url: string } }
    | Exclude<PublicationResult, { status: 'READY' }>
  > {
    validateFinalization(input);
    const token = await this.installationToken(input.installationId);
    const branchName = companionBranchName(input.pullRequestNumber, input.sourceHeadSha);

    const initialState = await this.inspectPublication(input, token, input.sourceHeadRef);
    if (initialState.result.status !== 'READY') return initialState.result;

    const originalBranch = await this.getBranchReference(input.repositoryName, branchName, token);
    const parentSha = originalBranch?.sha ?? input.sourceHeadSha;
    const baseTreeSha = await this.getCommitTreeSha(input.repositoryName, parentSha, token);
    const treeSha = await this.createTree(input.repositoryName, baseTreeSha, input.proposalFiles, token);
    const commitSha = await this.createCommit(
      input.repositoryName,
      `test: add ${input.proposalFiles.length} generated proposal(s) for PR #${input.pullRequestNumber}\n\nAnalysisRun ${input.analysisRunId}.`,
      treeSha,
      parentSha,
      token,
    );

    // Git objects are not visible from a branch until a ref is changed. Recheck
    // both the source PR and the companion PR immediately before that write.
    const beforeRefWrite = await this.inspectPublication(input, token, input.sourceHeadRef);
    if (beforeRefWrite.result.status !== 'READY') return beforeRefWrite.result;
    const currentBranch = await this.getBranchReference(input.repositoryName, branchName, token);
    if ((currentBranch?.sha ?? null) !== (originalBranch?.sha ?? null)) throw upstreamUnavailable();

    try {
      await this.writeBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
    } catch {
      let possiblyWritten: BranchReference | null;
      try {
        possiblyWritten = await this.getBranchReference(input.repositoryName, branchName, token);
      } catch {
        // The ref write may have succeeded despite a lost response. Without a
        // reliable readback, do not blindly delete or overwrite a branch.
        throw upstreamUnavailable();
      }
      if (possiblyWritten?.sha === commitSha) {
        try {
          await this.restoreBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
        } catch {
          throw upstreamUnavailable();
        }
      }
      throw upstreamUnavailable();
    }

    // The ref must exist before GitHub can create a new PR. Recheck even when
    // reusing an open PR, because it may close while the ref update is in flight.
    let beforePullRequest: PublicationState;
    try {
      beforePullRequest = await this.inspectPublication(input, token, input.sourceHeadRef);
    } catch {
      await this.restoreBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
      throw upstreamUnavailable();
    }
    if (beforePullRequest.result.status !== 'READY') {
      await this.restoreBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
      return beforePullRequest.result;
    }
    if (beforePullRequest.companionPullRequest) {
      return {
        status: 'PUBLISHED',
        branchName,
        commitSha,
        pullRequest: { number: beforePullRequest.companionPullRequest.number, url: beforePullRequest.companionPullRequest.url },
      };
    }

    try {
      const pullRequest = await this.createPullRequest(input, branchName, token);
      return { status: 'PUBLISHED', branchName, commitSha, pullRequest: { number: pullRequest.number, url: pullRequest.url } };
    } catch {
      let latestState: PublicationState;
      try {
        latestState = await this.inspectPublication(input, token, input.sourceHeadRef);
      } catch {
        await this.restoreBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
        throw upstreamUnavailable();
      }
      if (latestState.result.status === 'READY' && latestState.companionPullRequest) {
        return {
          status: 'PUBLISHED',
          branchName,
          commitSha,
          pullRequest: { number: latestState.companionPullRequest.number, url: latestState.companionPullRequest.url },
        };
      }
      await this.restoreBranchReference(input.repositoryName, branchName, commitSha, originalBranch, token);
      if (latestState.result.status !== 'READY') return latestState.result;
      throw upstreamUnavailable();
    }
  }

  private async installationToken(installationId: string): Promise<string> {
    try {
      return await this.appAuth.getInstallationToken(installationId);
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) {
        throw new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The requested GitHub resource was not found.', 404, false);
      }
      if (error instanceof GithubIntegrationError) throw error;
      throw upstreamUnavailable();
    }
  }

  private async inspectPublication(
    input: PublicationRequestDto,
    token: string,
    expectedHeadRef?: string,
  ): Promise<PublicationState> {
    const source = await this.getSourcePullRequest(input.repositoryName, input.pullRequestNumber, token);
    if (source.state !== 'open' || source.headSha !== input.sourceHeadSha ||
      (expectedHeadRef !== undefined && source.headRef !== expectedHeadRef)) {
      return { result: { status: 'STALE' }, companionPullRequest: null, source };
    }

    const branchName = companionBranchName(input.pullRequestNumber, input.sourceHeadSha);
    const companionPullRequest = await this.findCompanionPullRequest(input.repositoryName, branchName, source.headRef, token);
    if (companionPullRequest?.state === 'closed') {
      return {
        result: { status: 'EXISTING_PR_CLOSED', number: companionPullRequest.number },
        companionPullRequest,
        source,
      };
    }
    return { result: { status: 'READY' }, companionPullRequest, source };
  }

  private async getSourcePullRequest(repositoryName: string, pullRequestNumber: number, token: string): Promise<SourcePullRequest> {
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}/pulls/${pullRequestNumber}`, token);
    const data = await this.requireJson<{
      state?: unknown;
      head?: { sha?: unknown; ref?: unknown };
      base?: { ref?: unknown };
    }>(response);
    if ((data.state !== 'open' && data.state !== 'closed') || typeof data.head?.sha !== 'string' ||
      typeof data.head.ref !== 'string' || typeof data.base?.ref !== 'string') throw upstreamUnavailable();
    return { state: data.state, headSha: data.head.sha, headRef: data.head.ref, baseRef: data.base.ref };
  }

  private async findCompanionPullRequest(
    repositoryName: string,
    branchName: string,
    baseBranch: string,
    token: string,
  ): Promise<PullRequestSummary | null> {
    const owner = repositoryName.split('/')[0];
    const head = encodeURIComponent(`${owner}:${branchName}`);
    const base = encodeURIComponent(baseBranch);
    // Query each state separately so a closed PR remains detectable even if
    // many older PRs push it beyond one page of `state=all` results.
    const closed = await this.listCompanionPullRequests(repositoryName, head, base, 'closed', token);
    if (closed.length > 0) return closed[0];
    const open = await this.listCompanionPullRequests(repositoryName, head, base, 'open', token);
    return open[0] ?? null;
  }

  private async listCompanionPullRequests(
    repositoryName: string,
    head: string,
    base: string,
    state: 'open' | 'closed',
    token: string,
  ): Promise<PullRequestSummary[]> {
    const response = await this.request(
      `/repos/${repositoryPath(repositoryName)}/pulls?head=${head}&base=${base}&state=${state}&per_page=1`,
      token,
    );
    const data = await this.requireJson<unknown>(response);
    if (!Array.isArray(data)) throw upstreamUnavailable();
    const pullRequests = data.map(normalizePullRequestSummary);
    if (pullRequests.some((item) => item === null || item.state !== state)) throw upstreamUnavailable();
    return pullRequests as PullRequestSummary[];
  }

  private async getBranchReference(repositoryName: string, branchName: string, token: string): Promise<BranchReference | null> {
    const ref = branchName.split('/').map(encodeURIComponent).join('/');
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}/git/ref/heads/${ref}`, token);
    if (response.status === 404) return null;
    const data = await this.requireJson<{ object?: { sha?: unknown } }>(response);
    if (typeof data.object?.sha !== 'string' || !shaPattern.test(data.object.sha)) throw upstreamUnavailable();
    return { sha: data.object.sha };
  }

  private async getCommitTreeSha(repositoryName: string, commitSha: string, token: string): Promise<string> {
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}/git/commits/${encodeURIComponent(commitSha)}`, token);
    const data = await this.requireJson<{ tree?: { sha?: unknown } }>(response);
    if (typeof data.tree?.sha !== 'string' || !shaPattern.test(data.tree.sha)) throw upstreamUnavailable();
    return data.tree.sha;
  }

  private async createTree(
    repositoryName: string,
    baseTreeSha: string,
    files: CompanionPullRequestRequestDto['proposalFiles'],
    token: string,
  ): Promise<string> {
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}/git/trees`, token, {
      method: 'POST',
      body: {
        base_tree: baseTreeSha,
        tree: files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', sha: file.blobSha })),
      },
    });
    const data = await this.requireJson<{ sha?: unknown }>(response);
    if (typeof data.sha !== 'string' || !shaPattern.test(data.sha)) throw upstreamUnavailable();
    return data.sha;
  }

  private async createCommit(repositoryName: string, message: string, treeSha: string, parentSha: string, token: string): Promise<string> {
    const response = await this.request(`/repos/${repositoryPath(repositoryName)}/git/commits`, token, {
      method: 'POST',
      body: { message, tree: treeSha, parents: [parentSha] },
    });
    const data = await this.requireJson<{ sha?: unknown }>(response);
    if (typeof data.sha !== 'string' || !shaPattern.test(data.sha)) throw upstreamUnavailable();
    return data.sha;
  }

  private async writeBranchReference(
    repositoryName: string,
    branchName: string,
    commitSha: string,
    previous: BranchReference | null,
    token: string,
  ): Promise<void> {
    const branchPath = branchName.split('/').map(encodeURIComponent).join('/');
    const response = previous
      ? await this.request(`/repos/${repositoryPath(repositoryName)}/git/refs/heads/${branchPath}`, token, {
        method: 'PATCH', body: { sha: commitSha, force: false },
      })
      : await this.request(`/repos/${repositoryPath(repositoryName)}/git/refs`, token, {
        method: 'POST', body: { ref: `refs/heads/${branchName}`, sha: commitSha },
      });
    await this.requireSuccess(response);
  }

  private async restoreBranchReference(
    repositoryName: string,
    branchName: string,
    expectedCurrentSha: string,
    previous: BranchReference | null,
    token: string,
  ): Promise<void> {
    const current = await this.getBranchReference(repositoryName, branchName, token);
    if (current?.sha !== expectedCurrentSha) throw upstreamUnavailable();
    const branchPath = branchName.split('/').map(encodeURIComponent).join('/');
    const response = previous
      ? await this.request(`/repos/${repositoryPath(repositoryName)}/git/refs/heads/${branchPath}`, token, {
        method: 'PATCH', body: { sha: previous.sha, force: true },
      })
      : await this.request(`/repos/${repositoryPath(repositoryName)}/git/refs/heads/${branchPath}`, token, { method: 'DELETE' });
    await this.requireSuccess(response);
  }

  private async createPullRequest(
    input: CompanionPullRequestRequestDto,
    branchName: string,
    token: string,
  ): Promise<PullRequestSummary> {
    const response = await this.request(`/repos/${repositoryPath(input.repositoryName)}/pulls`, token, {
      method: 'POST',
      body: {
        title: `RAG Core: generated tests for PR #${input.pullRequestNumber}`,
        head: branchName,
        base: input.sourceHeadRef,
        body: [
          `Tests generated for PR #${input.pullRequestNumber} (\`${input.sourceHeadSha}\`).`,
          '',
          `${input.proposalFiles.length} proposal file(s) reviewed for publication.`,
          '',
          `AnalysisRun: ${input.analysisRunId}.`,
          'This pull request is not merged automatically.',
        ].join('\n'),
      },
    });
    const data = await this.requireJson<{ number?: unknown; html_url?: unknown; state?: unknown }>(response);
    const normalized = normalizePullRequestSummary(data);
    if (!normalized || normalized.state !== 'open') throw upstreamUnavailable();
    return normalized;
  }

  private async request(path: string, token: string, options: Parameters<GithubApiClient['request']>[2] = {}): Promise<Response> {
    try {
      return await this.api.request(path, token, options);
    } catch {
      throw upstreamUnavailable();
    }
  }

  private async requireJson<T>(response: Response): Promise<T> {
    await this.requireSuccess(response);
    const data = await readJson<T>(response);
    if (data === null) throw upstreamUnavailable();
    return data;
  }

  private async requireSuccess(response: Response): Promise<void> {
    if (response.ok) return;
    if (response.status === 404) {
      throw new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The requested GitHub resource was not found.', 404, false);
    }
    throw upstreamUnavailable();
  }
}

function companionBranchName(pullRequestNumber: number, sourceHeadSha: string): string {
  return `rag-tests/pr-${pullRequestNumber}-${sourceHeadSha.slice(0, 7)}`;
}

function normalizeCheckId(value: unknown): string {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw upstreamUnavailable();
  return String(value);
}

function checkRunBody(input: GithubCheckRequestDto): Record<string, unknown> {
  return {
    name: input.name,
    head_sha: input.headSha,
    status: 'completed',
    conclusion: input.conclusion,
    ...(input.detailsUrl === undefined ? {} : { details_url: input.detailsUrl }),
    output: { title: input.title, summary: input.summary },
  };
}

function checkRequestHash(input: GithubCheckRequestDto): string {
  const canonical = {
    status: 'completed',
    conclusion: input.conclusion,
    title: input.title,
    summary: input.summary,
    ...(input.detailsUrl === undefined ? {} : { detailsUrl: input.detailsUrl }),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function isSafePath(path: string): boolean {
  return pathPattern.test(path) && !Array.from(path).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  }) && path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isValidBranchName(name: string): boolean {
  if (!name || name.length > 255 || name === '@' || name.startsWith('/') || name.endsWith('/') || name.endsWith('.') ||
    name.includes('//') || name.includes('..') || name.includes('@{')) return false;
  if (Array.from(name).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || forbiddenBranchCharacters.has(character);
  })) return false;
  return name.split('/').every((segment) => segment.length > 0 && !segment.startsWith('.') && !segment.toLowerCase().endsWith('.lock'));
}

function validateUtf8Base64(contentBase64: string): void {
  if (!contentBase64 || contentBase64.length > maxProposalBase64Length ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
    throw invalidRequest();
  }
  const bytes = Buffer.from(contentBase64, 'base64');
  if (bytes.length === 0 || bytes.length > maxProposalBytes || bytes.toString('base64') !== contentBase64) throw invalidRequest();
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw invalidRequest();
  }
}

function validateFinalization(input: CompanionPullRequestRequestDto): void {
  if (!shaPattern.test(input.sourceHeadSha) || !isValidBranchName(input.sourceHeadRef) ||
    input.proposalFiles.length === 0 || input.proposalFiles.some((file) => !isSafePath(file.path) || !shaPattern.test(file.blobSha))) {
    throw invalidRequest();
  }
  if (new Set(input.proposalFiles.map((file) => file.path)).size !== input.proposalFiles.length) throw invalidRequest();
}

function normalizePullRequestSummary(value: unknown): PullRequestSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { number?: unknown; html_url?: unknown; state?: unknown };
  if (!Number.isSafeInteger(record.number) || typeof record.html_url !== 'string' ||
    (record.state !== 'open' && record.state !== 'closed')) return null;
  return { number: record.number as number, url: record.html_url, state: record.state };
}

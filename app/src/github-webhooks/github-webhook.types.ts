export type NormalizedWebhookData =
  | {
      kind: 'PULL_REQUEST';
      repository: { id: string; fullName: string };
      installationId: string | null;
      pullRequestNumber: number;
      pullRequest: {
        title: string;
        draft: boolean;
        merged: boolean;
        createdAt: string | null;
        base: { ref: string; sha: string };
        head: { ref: string; sha: string };
        userLogin: string | null;
      };
    }
  | { kind: 'INSTALLATION'; installationId: string; account: { id: string | null; type: string | null } }
  | {
      kind: 'INSTALLATION_REPOSITORIES';
      installationId: string;
      added: Array<{ id: string; fullName: string }>;
      removed: Array<{ id: string; fullName: string }>;
    }
  | {
      kind: 'REPOSITORY';
      repository: {
        id: string;
        fullName: string;
        owner: { id: string; login: string | null; type: string | null } | null;
      };
      installationId: string | null;
    }
  | { kind: 'MEMBER'; memberId: string | null; repositoryId: string | null }
  | { kind: 'MEMBERSHIP'; memberId: string | null; organizationId: string | null }
  | {
      kind: 'ORGANIZATION';
      organizationId: string | null;
      organizationLogin: string | null;
      membershipUserId: string | null;
    }
  | { kind: 'TEAM'; repositoryId: string | null; organizationId: string | null }
  | { kind: 'IGNORED' };

export interface NormalizedWebhookEvent {
  schemaVersion: 1;
  deliveryId: string;
  eventName: string;
  action: string | null;
  receivedAt: string;
  data: NormalizedWebhookData;
}

export interface GitHubWebhookAcceptedResponse {
  deliveryId: string;
  accepted: true;
  duplicate: boolean;
  analysisRunId: string | null;
}

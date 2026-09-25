import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const githubIdPattern = /^[1-9]\d*$/;
const repositoryNamePattern = /^(?!\.{1,2}\/)[A-Za-z0-9_.-]+\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;

export class DiscoveryRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage!: number;

  @IsOptional()
  @Matches(githubIdPattern)
  personalOwnerId?: string;

  @IsOptional()
  @Matches(githubIdPattern)
  organizationOwnerId?: string;
}

export class RepositoryNameRequestDto {
  @IsNotEmpty()
  @Matches(repositoryNamePattern)
  repositoryName!: string;
}

export class RepositoryInstallationRequestDto extends RepositoryNameRequestDto {}

export class RepositoryOwnerRequestDto extends RepositoryNameRequestDto {
  @IsNotEmpty()
  @Matches(githubIdPattern)
  installationId!: string;
}

export class RepositoryByIdRequestDto {
  @IsNotEmpty()
  @Matches(githubIdPattern)
  installationId!: string;

  @IsNotEmpty()
  @Matches(githubIdPattern)
  repositoryId!: string;
}

export class RepositoryPermissionRequestDto extends RepositoryOwnerRequestDto {
  @IsNotEmpty()
  @Matches(githubIdPattern)
  githubUserId!: string;
}

export class OrganizationMembershipRequestDto {
  @IsNotEmpty()
  @Matches(githubIdPattern)
  installationId!: string;

  @IsNotEmpty()
  @Matches(/^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,39}$/)
  organizationLogin!: string;

  @IsNotEmpty()
  @Matches(githubIdPattern)
  githubUserId!: string;
}

export class OrganizationOwnersRequestDto {
  @IsNotEmpty()
  @Matches(githubIdPattern)
  installationId!: string;

  @IsNotEmpty()
  @Matches(/^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,39}$/)
  organizationLogin!: string;
}

export class RepositoryCompareRequestDto extends RepositoryOwnerRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  baseSha!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  headSha!: string;
}

export class RepositoryTreeRequestDto extends RepositoryOwnerRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  commitSha!: string;
}

export class RepositoryFilesBatchRequestDto extends RepositoryTreeRequestDto {
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(4096, { each: true })
  @Matches(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*(?:^|\/)\.(?:\/|$)).+$/, { each: true })
  paths!: string[];
}

export class PullRequestHeadRequestDto extends RepositoryOwnerRequestDto {
  @IsInt()
  @Min(1)
  pullRequestNumber!: number;
}

const shaPattern = /^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;
const relativePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*(?:^|\/)\.(?:\/|$))(?!.*\/\/)[^\\]+$/;

export class GithubCheckRequestDto extends RepositoryOwnerRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @Matches(shaPattern)
  headSha!: string;

  @IsIn(['success', 'failure', 'neutral', 'cancelled', 'action_required'])
  conclusion!: 'success' | 'failure' | 'neutral' | 'cancelled' | 'action_required';

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsOptional()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  detailsUrl?: string;
}

export class PublicationRequestDto extends RepositoryOwnerRequestDto {
  @IsInt()
  @Min(1)
  pullRequestNumber!: number;

  @IsString()
  @Matches(shaPattern)
  sourceHeadSha!: string;
}

export class PublicationProposalBlobRequestDto extends PublicationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  @Matches(relativePathPattern)
  path!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(133333336)
  contentBase64!: string;
}

export class CompanionProposalFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  @Matches(relativePathPattern)
  path!: string;

  @IsString()
  @Matches(shaPattern)
  blobSha!: string;
}

export class CompanionPullRequestRequestDto extends PublicationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sourceHeadRef!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  analysisRunId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompanionProposalFileDto)
  proposalFiles!: CompanionProposalFileDto[];
}

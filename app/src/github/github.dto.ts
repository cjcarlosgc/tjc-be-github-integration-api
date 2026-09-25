import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

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

import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const githubIdPattern = /^[1-9]\d*$/;
const repositoryNamePattern = /^(?!\.{1,2}\/)[A-Za-z0-9_.-]+\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;

export class ListUserRepositoriesQueryDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class VerifyUserRepositoryAccessDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(githubIdPattern)
  repositoryId!: string;

  @IsString()
  @Matches(repositoryNamePattern)
  repositoryName!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  integrationBranch?: string;
}

export class ListUserRepositoryBranchesQueryDto {
  @IsUUID()
  projectId!: string;
}

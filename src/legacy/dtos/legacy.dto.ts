import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { trimString } from '../../common/dtos/transform.util';
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../user/dtos/user.dto';

const KEYWORD_MAX_LENGTH = 100;
const CITY_MAX_LENGTH = 10;
const FIREBASE_TOKEN_MAX_LENGTH = 4096;
const NAME_MAX_LENGTH = 32;
const PHONE_MAX_LENGTH = 20;
const COMMENT_MAX_LENGTH = 1000;
const JUDGMENT_ID_MAX_LENGTH = 50;
const MAX_RENT = 1_000_000;
export const LEGACY_DEFAULT_PAGE_SIZE = 10;
export const LEGACY_MAX_PAGE_SIZE = 50;

export class LegacyJudgmentSearchQuery {
  @ApiPropertyOptional({ description: '原告或被告姓名' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(KEYWORD_MAX_LENGTH)
  search?: string;
}

export class LegacyNameQuery {
  @ApiProperty({ description: '縣市' })
  @Transform(trimString)
  @IsString()
  @Length(1, CITY_MAX_LENGTH)
  city: string;

  @ApiPropertyOptional({ description: '租金下限' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RENT)
  rentMin = 0;

  @ApiPropertyOptional({ description: '租金上限' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RENT)
  rentMax = MAX_RENT;

  @ApiPropertyOptional({ description: '最少出現次數' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  score = 1;
}

export class LegacyCreateCommentBody {
  @ApiProperty({ description: '判決 ID' })
  @IsString()
  @Length(1, JUDGMENT_ID_MAX_LENGTH)
  filesetId: string;

  @ApiProperty({ description: '留言內容' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX_LENGTH)
  content: string;
}

export class LegacyCaseCommentBody {
  @ApiProperty({ description: '留言內容' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX_LENGTH)
  content: string;
}

export class LegacyCaseListQuery {
  @ApiPropertyOptional({ description: '頁碼' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每頁筆數（上限 50）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = LEGACY_DEFAULT_PAGE_SIZE;
}

export class LegacyVerifyBody {
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FIREBASE_TOKEN_MAX_LENGTH)
  token: string;
}

export class LegacyRegisterBody extends LegacyVerifyBody {
  @ApiProperty({ description: '密碼' })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password: string;

  @ApiProperty({ description: '姓名' })
  @Transform(trimString)
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ description: '暱稱' })
  @Transform(trimString)
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName: string;

  @ApiProperty({ description: 'Email' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;
}

export class LegacyLoginBody {
  @ApiProperty({ description: '手機' })
  @Transform(trimString)
  @IsString()
  @Length(1, PHONE_MAX_LENGTH)
  phone: string;

  @ApiProperty({ description: '密碼' })
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password: string;
}

/** 舊版 PUT /user：空字串視為未填 */
export class LegacyUpdateUserBody {
  @ApiPropertyOptional({ description: '暱稱' })
  @IsOptional()
  @Transform((params) => trimString(params) || undefined)
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @Transform((params) => trimString(params) || undefined)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email?: string;

  @ApiPropertyOptional({ description: '新密碼' })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password?: string;
}

/** 舊版回應格式（不加 { status, code, data } 外框） */
export interface LegacyUser {
  uid: string;
  phone: string;
  ip?: string;
  name?: string;
  email?: string;
  displayName?: string;
}

export interface LegacyUserWithToken extends LegacyUser {
  token: string;
}

export interface LegacyComment {
  id: number;
  content: string;
  displayName?: string;
  createdAt: Date;
}

export interface LegacyJudgmentComment extends LegacyComment {
  filesetId: string;
}

export interface LegacyCaseComment extends LegacyComment {
  caseId: number;
}

export interface LegacyNameCount {
  name: string;
  count: number;
}

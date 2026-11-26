import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateBy, ValidationOptions } from 'class-validator';
import { PaginationMetaResponse, PaginationQuery } from '../../common/dtos/pagination.dto';
import { trimString } from '../../common/dtos/transform.util';
import { isDistrictOfCity, TAIWAN_CITIES, toCanonicalCity, toCanonicalDistrict } from '../../common/utils/city.util';

const TITLE_MAX_LENGTH = 100;
const CONTENT_MAX_LENGTH = 5000;
const LOCATION_MAX_LENGTH = 20;
const DEFENDANT_NAME_MAX_LENGTH = 32;
const DEFENDANT_CONTACT_MAX_LENGTH = 16;
const KEYWORD_MAX_LENGTH = 32;
const MAX_RENT = 1_000_000;
export const CASE_COMMENT_MAX_LENGTH = 1000;

function trimToUndefined(params: TransformFnParams): unknown {
  const value = trimString(params);
  return value === '' ? undefined : value;
}

/** 縣市統一成清單寫法（台 / 臺 皆可） */
function canonicalCity(params: TransformFnParams): unknown {
  const value = trimToUndefined(params);
  return typeof value === 'string' ? (toCanonicalCity(value) ?? value) : value;
}

/** 鄉鎮市區統一成清單寫法（依同一筆資料的 location / city 判斷） */
function canonicalDistrict(params: TransformFnParams): unknown {
  const value = trimToUndefined(params);
  const source = params.obj as { location?: unknown; city?: unknown };
  const city = typeof source.location === 'string' ? source.location : source.city;
  if (typeof value !== 'string' || typeof city !== 'string') return value;
  return toCanonicalDistrict(city, value) ?? value;
}

/** district 必須是 location 這個縣市底下的鄉鎮市區 */
function IsDistrictOfLocation(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isDistrictOfLocation',
      validator: {
        validate: (value: unknown, args) => {
          const { location } = args?.object as { location?: unknown };
          return typeof value === 'string' && typeof location === 'string' && isDistrictOfCity(location, value);
        },
        defaultMessage: () => 'district must belong to location',
      },
    },
    options,
  );
}

export class ListCasesQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: '縣市（例：台北市；台 / 臺 皆可）' })
  @IsOptional()
  @Transform(canonicalCity)
  @IsString()
  @MaxLength(LOCATION_MAX_LENGTH)
  city?: string;

  @ApiPropertyOptional({ description: '鄉鎮市區' })
  @IsOptional()
  @Transform(canonicalDistrict)
  @IsString()
  @MaxLength(LOCATION_MAX_LENGTH)
  district?: string;
}

export class SearchCasesQuery extends PaginationQuery {
  @ApiProperty({ description: '對象姓名 / 電話 / 身分證（完全相符）' })
  @Transform(trimString)
  @IsString()
  @Length(1, KEYWORD_MAX_LENGTH)
  keyword: string;
}

export class CaseDetailQuery {
  @ApiProperty({ description: '案例 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class CaseIdQuery {
  @ApiProperty({ description: '案例 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  caseId: number;
}

/** multipart/form-data 欄位（images 由 FilesInterceptor 處理） */
export class CreateCaseBody {
  @ApiProperty({ description: '標題', maxLength: TITLE_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ description: '事件經過', maxLength: CONTENT_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, CONTENT_MAX_LENGTH)
  content: string;

  @ApiProperty({ description: '縣市（台 / 臺 皆可，存成清單寫法）', enum: TAIWAN_CITIES })
  @Transform(canonicalCity)
  @IsIn(TAIWAN_CITIES)
  location: string;

  @ApiProperty({ description: '鄉鎮市區（需屬於該縣市，台 / 臺 皆可）' })
  @Transform(canonicalDistrict)
  @IsDistrictOfLocation()
  district: string;

  @ApiProperty({ description: '月租金', minimum: 0, maximum: MAX_RENT })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RENT)
  rent: number;

  @ApiProperty({ description: '對象姓名', maxLength: DEFENDANT_NAME_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, DEFENDANT_NAME_MAX_LENGTH)
  defendantName: string;

  @ApiPropertyOptional({ description: '對象電話', maxLength: DEFENDANT_CONTACT_MAX_LENGTH })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(DEFENDANT_CONTACT_MAX_LENGTH)
  defendantPhone?: string;

  @ApiPropertyOptional({ description: '對象身分證', maxLength: DEFENDANT_CONTACT_MAX_LENGTH })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(DEFENDANT_CONTACT_MAX_LENGTH)
  defendantIdNo?: string;
}

export class CreateCaseCommentBody {
  @ApiProperty({ description: '案例 ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  caseId: number;

  @ApiProperty({ description: '留言內容', maxLength: CASE_COMMENT_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CASE_COMMENT_MAX_LENGTH)
  content: string;
}

export class ToggleCaseLikeBody extends CaseIdQuery {}

export class CaseListItemResponse {
  @ApiProperty({ description: '案例 ID' })
  id: number;

  @ApiProperty({ description: '標題' })
  title: string;

  @ApiProperty({ description: '事件經過' })
  content: string;

  @ApiPropertyOptional({ description: '縣市' })
  location?: string;

  @ApiPropertyOptional({ description: '鄉鎮市區' })
  district?: string;

  @ApiProperty({ description: '月租金' })
  rent: number;

  @ApiProperty({ description: '對象姓名（遮罩）' })
  defendantName: string;

  @ApiProperty({ description: '對象電話（遮罩）' })
  defendantPhone: string;

  @ApiProperty({ description: '對象身分證（遮罩）' })
  defendantIdNo: string;

  @ApiProperty({ type: [String], description: '證據照片' })
  imageUrls: string[];

  @ApiPropertyOptional({ description: '回報者暱稱' })
  authorDisplayName?: string;

  @ApiProperty({ description: '按讚數' })
  likeCount: number;

  @ApiProperty({ description: '留言數' })
  commentCount: number;

  @ApiProperty({ description: '建立時間', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ description: '更新時間', format: 'date-time' })
  updatedAt: Date;
}

export class CasePageResponse {
  @ApiProperty({ type: [CaseListItemResponse], description: '案例列表' })
  list: CaseListItemResponse[];

  @ApiProperty({ type: () => PaginationMetaResponse, description: '分頁資訊' })
  meta: PaginationMetaResponse;
}

export class CreatedCaseResponse {
  @ApiProperty({ description: '新案例 ID' })
  id: number;
}

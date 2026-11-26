import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { PaginationMetaResponse, PaginationQuery } from '../../common/dtos/pagination.dto';
import { trimString } from '../../common/dtos/transform.util';

const KEYWORD_MAX_LENGTH = 100;
const JUDGMENT_ID_MAX_LENGTH = 50;
const CITY_MAX_LENGTH = 10;
const MAX_RENT = 1_000_000;
export const DEFAULT_WARNING_MIN_COUNT = 2;
export const COMMENT_MAX_LENGTH = 1000;

export class SearchJudgmentsQuery extends PaginationQuery {
  @ApiProperty({ description: '原告或被告姓名（完全相符）', example: '張淑晶' })
  @Transform(trimString)
  @IsString()
  @Length(1, KEYWORD_MAX_LENGTH)
  keyword: string;
}

export class JudgmentDetailQuery {
  @ApiProperty({ description: '判決 ID', example: 'CCEV,100,潮簡,260,20110811,1' })
  @IsString()
  @Length(1, JUDGMENT_ID_MAX_LENGTH)
  id: string;
}

export class WarningNamesQuery {
  @ApiProperty({ description: '縣市（台北市 / 臺北市 / 臺北 皆可）', example: '台北市' })
  @Transform(trimString)
  @IsString()
  @Length(1, CITY_MAX_LENGTH)
  city: string;

  @ApiPropertyOptional({ description: '租金下限', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RENT)
  rentMin = 0;

  @ApiPropertyOptional({ description: '租金上限', default: MAX_RENT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RENT)
  rentMax = MAX_RENT;

  @ApiPropertyOptional({ description: '最少出現次數', default: DEFAULT_WARNING_MIN_COUNT, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCount = DEFAULT_WARNING_MIN_COUNT;
}

export class FilesetQuery {
  @ApiProperty({ description: '判決 ID' })
  @IsString()
  @Length(1, JUDGMENT_ID_MAX_LENGTH)
  filesetId: string;
}

export class CreateJudgmentCommentBody extends FilesetQuery {
  @ApiProperty({ description: '留言內容', maxLength: COMMENT_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MAX_LENGTH)
  content: string;
}

export class ToggleJudgmentLikeBody extends FilesetQuery {}

export class JudgmentListItemResponse {
  @ApiProperty({ description: '判決 ID' })
  id: string;

  @ApiPropertyOptional({ description: '年度' })
  jyear?: string;

  @ApiPropertyOptional({ description: '字別' })
  jcase?: string;

  @ApiPropertyOptional({ description: '號' })
  jno?: string;

  @ApiProperty({ description: '裁判日期', format: 'date' })
  jdate: string;

  @ApiPropertyOptional({ description: '案由' })
  jtitle?: string;

  @ApiPropertyOptional({ description: '原告' })
  plaintiff?: string;

  @ApiPropertyOptional({ description: '被告' })
  defendant?: string;

  @ApiPropertyOptional({ description: '月租金' })
  rent?: number;

  @ApiPropertyOptional({ description: '縣市（判決資料格式，例：臺北）' })
  city?: string;

  @ApiPropertyOptional({ description: '鄉鎮市區' })
  district?: string;

  @ApiPropertyOptional({ description: '勝訴方', enum: ['plaintiff', 'defendant'] })
  win?: string;

  @ApiProperty({ description: '按讚數' })
  likeCount: number;

  @ApiProperty({ description: '留言數' })
  commentCount: number;
}

export class JudgmentDetailResponse extends JudgmentListItemResponse {
  @ApiProperty({ description: '判決全文' })
  jfull: string;

  @ApiPropertyOptional({ description: '司法院原始文件連結' })
  jpdf?: string;
}

export class JudgmentPageResponse {
  @ApiProperty({ type: [JudgmentListItemResponse], description: '判決列表' })
  list: JudgmentListItemResponse[];

  @ApiProperty({ type: () => PaginationMetaResponse, description: '分頁資訊' })
  meta: PaginationMetaResponse;
}

export class WarningNameResponse {
  @ApiProperty({ description: '姓名' })
  name: string;

  @ApiProperty({ description: '敗訴判決數' })
  judgmentCount: number;
}

export class WarningNameListResponse {
  @ApiProperty({ type: [WarningNameResponse], description: '高風險名單' })
  list: WarningNameResponse[];
}

export class CityStatResponse {
  @ApiProperty({ description: '縣市（判決資料格式）' })
  city: string;

  @ApiProperty({ description: '判決數' })
  judgmentCount: number;
}

export class CityStatListResponse {
  @ApiProperty({ type: [CityStatResponse], description: '各縣市判決數' })
  list: CityStatResponse[];
}

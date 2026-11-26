import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export class PaginationQuery {
  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE, description: '頁碼（從 1 開始）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT, description: '每頁筆數' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;
}

export class PaginationMetaResponse {
  @ApiProperty({ description: '每頁筆數' })
  take: number;

  @ApiProperty({ description: '目前頁碼' })
  page: number;

  @ApiProperty({ description: '總頁數' })
  pageCount: number;

  @ApiProperty({ description: '本頁筆數' })
  itemCount: number;

  @ApiProperty({ description: '總筆數' })
  totalCount: number;

  @ApiProperty({ description: '是否有上一頁' })
  hasPreviousPage: boolean;

  @ApiProperty({ description: '是否有下一頁' })
  hasNextPage: boolean;
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ApiSuccessResponse, success } from '../common/api/response';
import {
  CityStatListResponse,
  JudgmentDetailQuery,
  JudgmentDetailResponse,
  JudgmentPageResponse,
  SearchJudgmentsQuery,
  WarningNameListResponse,
  WarningNamesQuery,
} from './dtos/judgment.dto';
import { JudgmentNotFoundError, JudgmentService } from './judgment.service';

@ApiTags('judgments')
@Controller('judgments')
export class JudgmentController {
  constructor(private readonly judgmentService: JudgmentService) {}

  @Get()
  @ApiOkResponse({ type: JudgmentPageResponse })
  async search(@Query() query: SearchJudgmentsQuery): Promise<ApiSuccessResponse<JudgmentPageResponse>> {
    return success(await this.judgmentService.search(query));
  }

  @Get('detail')
  @ApiOkResponse({ type: JudgmentDetailResponse })
  async getDetail(@Query() query: JudgmentDetailQuery): Promise<ApiSuccessResponse<JudgmentDetailResponse>> {
    try {
      return success(await this.judgmentService.getDetail(query.id));
    } catch (error) {
      throw translateJudgmentError(error);
    }
  }

  @Get('warning_names')
  @ApiOkResponse({ type: WarningNameListResponse })
  async getWarningNames(@Query() query: WarningNamesQuery): Promise<ApiSuccessResponse<WarningNameListResponse>> {
    return success({ list: await this.judgmentService.getWarningNames(query) });
  }

  @Get('city_stats')
  @ApiOkResponse({ type: CityStatListResponse })
  async getCityStats(): Promise<ApiSuccessResponse<CityStatListResponse>> {
    return success({ list: await this.judgmentService.getCityStats() });
  }
}

export function translateJudgmentError(error: unknown): unknown {
  if (error instanceof JudgmentNotFoundError) return new ApiException(ErrorCodes.NOT_FOUND, error.message);
  return error;
}

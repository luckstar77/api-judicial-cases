import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ApiSuccessResponse, success } from '../common/api/response';
import { HealthResponse, LegacyHealthResponse } from './dtos/health.dto';
import { DatabaseUnavailableError, HealthService } from './health.service';

@ApiTags('health')
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOkResponse({ type: HealthResponse })
  async check(): Promise<ApiSuccessResponse<HealthResponse>> {
    try {
      await this.healthService.checkDatabase();
      return success({ db: 'up' });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) throw new ApiException(ErrorCodes.INTERNAL_ERROR, 'database unavailable');
      throw error;
    }
  }

  /** 舊版（未加版號）健康檢查，給既有監控沿用 */
  @Get('health')
  @Version(VERSION_NEUTRAL)
  @ApiOkResponse({ type: LegacyHealthResponse })
  legacyCheck(): LegacyHealthResponse {
    return { status: 'OK' };
  }
}

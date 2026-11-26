import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, success } from '../common/api/response';
import { StatsResponse } from './dtos/stats.dto';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOkResponse({ type: StatsResponse })
  async getStats(): Promise<ApiSuccessResponse<StatsResponse>> {
    return success(await this.statsService.getStats());
  }
}

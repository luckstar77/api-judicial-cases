import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, success } from '../common/api/response';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LikeStateResponse } from '../common/dtos/engagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { FilesetQuery, ToggleJudgmentLikeBody } from './dtos/judgment.dto';
import { JudgmentLikeService } from './judgment-like.service';
import { translateJudgmentError } from './judgment.controller';

@ApiTags('judgment_likes')
@Controller('judgment_likes')
export class JudgmentLikeController {
  constructor(private readonly judgmentLikeService: JudgmentLikeService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: LikeStateResponse })
  async getState(@Query() query: FilesetQuery, @CurrentUser() user?: RequestUser): Promise<ApiSuccessResponse<LikeStateResponse>> {
    return success(await this.judgmentLikeService.getState(query.filesetId, user?.uid));
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LikeStateResponse })
  async toggle(@CurrentUser() user: RequestUser, @Body() body: ToggleJudgmentLikeBody): Promise<ApiSuccessResponse<LikeStateResponse>> {
    try {
      return success(await this.judgmentLikeService.toggle(body.filesetId, user.uid));
    } catch (error) {
      throw translateJudgmentError(error);
    }
  }
}

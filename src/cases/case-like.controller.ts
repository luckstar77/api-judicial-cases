import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, success } from '../common/api/response';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LikeStateResponse } from '../common/dtos/engagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CaseLikeService } from './case-like.service';
import { translateCaseError } from './case.controller';
import { CaseIdQuery, ToggleCaseLikeBody } from './dtos/case.dto';

@ApiTags('case_likes')
@Controller('case_likes')
export class CaseLikeController {
  constructor(private readonly caseLikeService: CaseLikeService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: LikeStateResponse })
  async getState(@Query() query: CaseIdQuery, @CurrentUser() user?: RequestUser): Promise<ApiSuccessResponse<LikeStateResponse>> {
    return success(await this.caseLikeService.getState(query.caseId, user?.uid));
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LikeStateResponse })
  async toggle(@CurrentUser() user: RequestUser, @Body() body: ToggleCaseLikeBody): Promise<ApiSuccessResponse<LikeStateResponse>> {
    try {
      return success(await this.caseLikeService.toggle(body.caseId, user.uid));
    } catch (error) {
      throw translateCaseError(error);
    }
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, success } from '../common/api/response';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentListResponse, CommentResponse } from '../common/dtos/engagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateJudgmentCommentBody, FilesetQuery } from './dtos/judgment.dto';
import { JudgmentCommentService } from './judgment-comment.service';
import { translateJudgmentError } from './judgment.controller';

@ApiTags('judgment_comments')
@Controller('judgment_comments')
export class JudgmentCommentController {
  constructor(private readonly judgmentCommentService: JudgmentCommentService) {}

  @Get()
  @ApiOkResponse({ type: CommentListResponse })
  async list(@Query() query: FilesetQuery): Promise<ApiSuccessResponse<CommentListResponse>> {
    return success({ list: await this.judgmentCommentService.list(query.filesetId) });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: CommentResponse })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateJudgmentCommentBody,
    @ClientIp() ip: string,
  ): Promise<ApiSuccessResponse<CommentResponse>> {
    try {
      return success(await this.judgmentCommentService.create({ filesetId: body.filesetId, userId: user.uid, content: body.content, ip }));
    } catch (error) {
      throw translateJudgmentError(error);
    }
  }
}

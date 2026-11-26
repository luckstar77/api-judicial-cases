import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, success } from '../common/api/response';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentListResponse, CommentResponse } from '../common/dtos/engagement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CaseCommentService } from './case-comment.service';
import { translateCaseError } from './case.controller';
import { CaseIdQuery, CreateCaseCommentBody } from './dtos/case.dto';

@ApiTags('case_comments')
@Controller('case_comments')
export class CaseCommentController {
  constructor(private readonly caseCommentService: CaseCommentService) {}

  @Get()
  @ApiOkResponse({ type: CommentListResponse })
  async list(@Query() query: CaseIdQuery): Promise<ApiSuccessResponse<CommentListResponse>> {
    return success({ list: await this.caseCommentService.list(query.caseId) });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: CommentResponse })
  async create(@CurrentUser() user: RequestUser, @Body() body: CreateCaseCommentBody, @ClientIp() ip: string): Promise<ApiSuccessResponse<CommentResponse>> {
    try {
      return success(await this.caseCommentService.create({ caseId: body.caseId, userId: user.uid, content: body.content, ip }));
    } catch (error) {
      throw translateCaseError(error);
    }
  }
}

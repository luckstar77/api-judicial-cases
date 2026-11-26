import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JudgmentFullTextVO } from '../database/repositories/interfaces/judgment.interface';
import { translateAuthError } from '../auth/auth.controller';
import { AuthThrottle } from '../auth/auth.throttle';
import { CASE_IMAGE_FIELD, CASE_UPLOAD_OPTIONS, MAX_CASE_IMAGES } from '../cases/case-upload.options';
import { translateCaseError } from '../cases/case.controller';
import { CreateCaseBody } from '../cases/dtos/case.dto';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { translateJudgmentError } from '../judgment/judgment.controller';
import { CurrentPasswordMismatchError, UserNotFoundError } from '../user/user.service';
import {
  LegacyCaseCommentBody,
  LegacyCaseListQuery,
  LegacyCreateCommentBody,
  LegacyJudgmentComment,
  LegacyJudgmentSearchQuery,
  LegacyLoginBody,
  LegacyNameCount,
  LegacyNameQuery,
  LegacyRegisterBody,
  LegacyUpdateUserBody,
  LegacyUser,
  LegacyUserWithToken,
  LegacyVerifyBody,
} from './dtos/legacy.dto';
import { LegacyCase, LegacyCaseDetail, LegacyService } from './legacy.service';

interface LikedResponse {
  liked: boolean;
}

/**
 * @deprecated 舊前端使用的未加版號路徑，回應維持原本格式（無 { status, code, data } 外框）。
 * 錯誤一律回 `{ message }` 與對應 HTTP status（見 AllExceptionsFilter）。
 */
/** 舊前端一張卡片會各自打留言數、按讚數、按讚狀態，讀取路徑不限流（舊版伺服器原本也沒有限流）；寫入與登入仍限流 */
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class LegacyController {
  constructor(private readonly legacyService: LegacyService) {}

  // ---------- 判決 ----------

  @SkipThrottle()
  @Get('cases')
  searchJudgments(@Query() query: LegacyJudgmentSearchQuery): Promise<JudgmentFullTextVO[]> {
    return this.legacyService.searchJudgments(query.search);
  }

  @SkipThrottle()
  @Get('name')
  getNameCounts(@Query() query: LegacyNameQuery): Promise<LegacyNameCount[]> {
    return this.legacyService.getNameCounts(query);
  }

  @SkipThrottle()
  @Get('comment/:filesetId')
  listJudgmentComments(@Param('filesetId') filesetId: string): Promise<LegacyJudgmentComment[]> {
    return this.legacyService.listJudgmentComments(filesetId);
  }

  @Post('comment')
  @UseGuards(JwtAuthGuard)
  async createJudgmentComment(@CurrentUser() user: RequestUser, @Body() body: LegacyCreateCommentBody, @ClientIp() ip: string): Promise<LegacyJudgmentComment> {
    try {
      return await this.legacyService.createJudgmentComment(user.uid, body.filesetId, body.content, ip);
    } catch (error) {
      throw translateJudgmentError(error);
    }
  }

  @Post('likes/:filesetId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleJudgmentLike(@CurrentUser() user: RequestUser, @Param('filesetId') filesetId: string): Promise<LikedResponse> {
    try {
      return { liked: await this.legacyService.toggleJudgmentLike(filesetId, user.uid) };
    } catch (error) {
      throw translateJudgmentError(error);
    }
  }

  @SkipThrottle()
  @Get('likes/:filesetId/status')
  @UseGuards(JwtAuthGuard)
  async getJudgmentLikeStatus(@CurrentUser() user: RequestUser, @Param('filesetId') filesetId: string): Promise<LikedResponse> {
    return { liked: await this.legacyService.getJudgmentLikeStatus(filesetId, user.uid) };
  }

  @SkipThrottle()
  @Get('likes/:filesetId')
  async countJudgmentLikes(@Param('filesetId') filesetId: string): Promise<{ count: number }> {
    return { count: await this.legacyService.countJudgmentLikes(filesetId) };
  }

  // ---------- 網友回報案例（固定路徑需排在 :id 之前） ----------

  @SkipThrottle()
  @Get('case')
  listCases(@Query() query: LegacyCaseListQuery): Promise<LegacyCase[]> {
    return this.legacyService.listCases(query.page, query.pageSize);
  }

  @SkipThrottle()
  @Get('case/pages')
  async countCasePages(@Query() query: LegacyCaseListQuery): Promise<{ totalPages: number }> {
    return { totalPages: await this.legacyService.countCasePages(query.pageSize) };
  }

  @SkipThrottle()
  @Get('case/search/:search')
  @UseGuards(JwtAuthGuard)
  searchCases(@Param('search') search: string): Promise<LegacyCase[]> {
    return this.legacyService.searchCases(search);
  }

  @Post('case')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor(CASE_IMAGE_FIELD, MAX_CASE_IMAGES, CASE_UPLOAD_OPTIONS))
  async createCase(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateCaseBody,
    @ClientIp() ip: string,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ): Promise<{ id: number }> {
    try {
      return await this.legacyService.createCase(user.uid, ip, body, images);
    } catch (error) {
      throw translateCaseError(error);
    }
  }

  @SkipThrottle()
  @Get('case/:id')
  async getCaseDetail(@Param('id', ParseIntPipe) id: number): Promise<LegacyCaseDetail> {
    try {
      return await this.legacyService.getCaseDetail(id);
    } catch (error) {
      throw translateCaseError(error);
    }
  }

  @Post('case/:id/comments')
  @UseGuards(JwtAuthGuard)
  async createCaseComment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: LegacyCaseCommentBody,
    @ClientIp() ip: string,
  ): Promise<void> {
    try {
      await this.legacyService.createCaseComment(id, user.uid, body.content, ip);
    } catch (error) {
      throw translateCaseError(error);
    }
  }

  @Post('case/:id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleCaseLike(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number): Promise<LikedResponse> {
    try {
      return { liked: await this.legacyService.toggleCaseLike(id, user.uid) };
    } catch (error) {
      throw translateCaseError(error);
    }
  }

  @SkipThrottle()
  @Get('case/:id/like/status')
  @UseGuards(JwtAuthGuard)
  async getCaseLikeStatus(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number): Promise<LikedResponse> {
    return { liked: await this.legacyService.getCaseLikeStatus(id, user.uid) };
  }

  // ---------- 使用者 ----------

  @SkipThrottle()
  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUser(@CurrentUser() user: RequestUser): Promise<LegacyUser> {
    try {
      return await this.legacyService.getUser(user.uid);
    } catch (error) {
      throw translateLegacyUserError(error);
    }
  }

  @Put('user')
  @UseGuards(JwtAuthGuard)
  async updateUser(@CurrentUser() user: RequestUser, @Body() body: LegacyUpdateUserBody): Promise<LegacyUserWithToken> {
    try {
      return await this.legacyService.updateUser(user.uid, body);
    } catch (error) {
      throw translateLegacyUserError(error);
    }
  }

  @Post('user/verify')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  async verify(@Body() body: LegacyVerifyBody, @ClientIp() ip: string): Promise<LegacyUserWithToken> {
    try {
      return await this.legacyService.verify(body.token, ip);
    } catch (error) {
      throw translateAuthError(error);
    }
  }

  @Post('user/register')
  @AuthThrottle()
  async register(@Body() body: LegacyRegisterBody, @ClientIp() ip: string): Promise<LegacyUserWithToken> {
    try {
      return await this.legacyService.register(body, ip);
    } catch (error) {
      throw translateAuthError(error);
    }
  }

  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  async login(@Body() body: LegacyLoginBody): Promise<LegacyUserWithToken> {
    try {
      return await this.legacyService.login(body.phone, body.password);
    } catch (error) {
      throw translateAuthError(error);
    }
  }
}

function translateLegacyUserError(error: unknown): unknown {
  if (error instanceof UserNotFoundError) return new ApiException(ErrorCodes.NOT_FOUND, 'user not found');
  if (error instanceof CurrentPasswordMismatchError) return new ApiException(ErrorCodes.INVALID_CREDENTIALS, error.message);
  return error;
}

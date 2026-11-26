import { Body, Controller, Get, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ApiSuccessResponse, success } from '../common/api/response';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CASE_IMAGE_FIELD, CASE_UPLOAD_OPTIONS, MAX_CASE_IMAGES } from './case-upload.options';
import { CaseNotFoundError, CaseService } from './case.service';
import {
  CaseDetailQuery,
  CaseListItemResponse,
  CasePageResponse,
  CreateCaseBody,
  CreatedCaseResponse,
  ListCasesQuery,
  SearchCasesQuery,
} from './dtos/case.dto';

@ApiTags('cases')
@Controller('cases')
export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  @Get()
  @ApiOkResponse({ type: CasePageResponse })
  async list(@Query() query: ListCasesQuery): Promise<ApiSuccessResponse<CasePageResponse>> {
    return success(await this.caseService.list(query));
  }

  @Get('search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CasePageResponse })
  async search(@Query() query: SearchCasesQuery): Promise<ApiSuccessResponse<CasePageResponse>> {
    return success(await this.caseService.search(query));
  }

  @Get('detail')
  @ApiOkResponse({ type: CaseListItemResponse })
  async getDetail(@Query() query: CaseDetailQuery): Promise<ApiSuccessResponse<CaseListItemResponse>> {
    try {
      return success(await this.caseService.getDetail(query.id));
    } catch (error) {
      throw translateCaseError(error);
    }
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor(CASE_IMAGE_FIELD, MAX_CASE_IMAGES, CASE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: CreatedCaseResponse })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateCaseBody,
    @ClientIp() ip: string,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ): Promise<ApiSuccessResponse<CreatedCaseResponse>> {
    return success(await this.caseService.create({ userId: user.uid, ip, body, images }));
  }
}

export function translateCaseError(error: unknown): unknown {
  if (error instanceof CaseNotFoundError) return new ApiException(ErrorCodes.NOT_FOUND, error.message);
  return error;
}

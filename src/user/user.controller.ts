import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ApiSuccessResponse, success } from '../common/api/response';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { AuthResultResponse, UpdateMeBody, UserProfileResponse } from './dtos/user.dto';
import { CurrentPasswordMismatchError, UserNotFoundError, UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOkResponse({ type: UserProfileResponse })
  async getMe(@CurrentUser() user: RequestUser): Promise<ApiSuccessResponse<UserProfileResponse>> {
    try {
      return success(this.userService.toProfile(await this.userService.getUser(user.uid)));
    } catch (error) {
      throw translateUserError(error);
    }
  }

  @Patch('me')
  @ApiOkResponse({ type: AuthResultResponse })
  async updateMe(@CurrentUser() user: RequestUser, @Body() body: UpdateMeBody): Promise<ApiSuccessResponse<AuthResultResponse>> {
    try {
      const session = await this.userService.updateProfile(user.uid, body);
      return success({ user: this.userService.toProfile(session.user), accessToken: session.accessToken });
    } catch (error) {
      throw translateUserError(error);
    }
  }
}

export function translateUserError(error: unknown): unknown {
  // token 有效但帳號已不存在，視同未登入
  if (error instanceof UserNotFoundError) return new ApiException(ErrorCodes.UNAUTHORIZED, error.message);
  if (error instanceof CurrentPasswordMismatchError) return new ApiException(ErrorCodes.INVALID_CREDENTIALS, error.message);
  return error;
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ApiSuccessResponse, success } from '../common/api/response';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { InvalidFirebaseTokenError } from '../firebase/firebase.service';
import { AuthResultResponse } from '../user/dtos/user.dto';
import { AuthService, InvalidCredentialsError, PhoneAlreadyRegisteredError } from './auth.service';
import { AuthThrottle } from './auth.throttle';
import { LoginBody, RegisterBody, VerifyPhoneBody } from './dtos/auth.dto';

@ApiTags('auth')
@AuthThrottle()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResultResponse })
  async verify(@Body() body: VerifyPhoneBody, @ClientIp() ip: string): Promise<ApiSuccessResponse<AuthResultResponse>> {
    try {
      return success(this.authService.toResult(await this.authService.verifyPhone(body.firebaseToken, ip)));
    } catch (error) {
      throw translateAuthError(error);
    }
  }

  @Post('register')
  @ApiCreatedResponse({ type: AuthResultResponse })
  async register(@Body() body: RegisterBody, @ClientIp() ip: string): Promise<ApiSuccessResponse<AuthResultResponse>> {
    try {
      return success(this.authService.toResult(await this.authService.register(body, ip)));
    } catch (error) {
      throw translateAuthError(error);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResultResponse })
  async login(@Body() body: LoginBody): Promise<ApiSuccessResponse<AuthResultResponse>> {
    try {
      return success(this.authService.toResult(await this.authService.login(body.phone, body.password)));
    } catch (error) {
      throw translateAuthError(error);
    }
  }
}

export function translateAuthError(error: unknown): unknown {
  switch (true) {
    case error instanceof InvalidFirebaseTokenError:
      return new ApiException(ErrorCodes.INVALID_FIREBASE_TOKEN, error.message);
    case error instanceof InvalidCredentialsError:
      return new ApiException(ErrorCodes.INVALID_CREDENTIALS, error.message);
    case error instanceof PhoneAlreadyRegisteredError:
      return new ApiException(ErrorCodes.CONFLICT, error.message);
    default:
      return error;
  }
}

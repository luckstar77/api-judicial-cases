import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { trimString } from '../../common/dtos/transform.util';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const DISPLAY_NAME_MAX_LENGTH = 30;
export const EMAIL_MAX_LENGTH = 255;

export class UpdateMeBody {
  @ApiPropertyOptional({ description: '暱稱', maxLength: DISPLAY_NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email?: string;

  @ApiPropertyOptional({ description: '新密碼', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password?: string;
}

export class UserProfileResponse {
  @ApiProperty({ description: 'Firebase uid' })
  uid: string;

  @ApiProperty({ description: '手機（E.164）' })
  phone: string;

  @ApiPropertyOptional({ description: '姓名' })
  name?: string;

  @ApiPropertyOptional({ description: '暱稱' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email' })
  email?: string;
}

export class AuthResultResponse {
  @ApiProperty({ type: () => UserProfileResponse, description: '使用者資料' })
  user: UserProfileResponse;

  @ApiProperty({ description: 'JWT，放在 Authorization: Bearer <token>' })
  accessToken: string;
}

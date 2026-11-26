import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { trimString } from '../../common/dtos/transform.util';
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../user/dtos/user.dto';

const FIREBASE_TOKEN_MAX_LENGTH = 4096;
const NAME_MAX_LENGTH = 32;
const PHONE_MIN_LENGTH = 8;
const PHONE_MAX_LENGTH = 20;

export class VerifyPhoneBody {
  @ApiProperty({ description: 'Firebase 手機簡訊登入取得的 ID token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FIREBASE_TOKEN_MAX_LENGTH)
  firebaseToken: string;
}

export class RegisterBody extends VerifyPhoneBody {
  @ApiProperty({ description: '密碼', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password: string;

  @ApiProperty({ description: '姓名', maxLength: NAME_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ description: '暱稱（公開顯示）', maxLength: DISPLAY_NAME_MAX_LENGTH })
  @Transform(trimString)
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName: string;

  @ApiProperty({ description: 'Email' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;
}

export class LoginBody {
  @ApiProperty({ description: '手機，0912345678 或 +886912345678', example: '0912345678' })
  @Transform(trimString)
  @IsString()
  @Length(PHONE_MIN_LENGTH, PHONE_MAX_LENGTH)
  phone: string;

  @ApiProperty({ description: '密碼' })
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password: string;
}

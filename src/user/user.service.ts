import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserCredentialVO, UserVO } from '../database/repositories/interfaces/user.interface';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { TokenService } from '../token/token.service';
import { UpdateMeBody, UserProfileResponse } from './dtos/user.dto';

export class UserNotFoundError extends Error {}
export class CurrentPasswordMismatchError extends Error {}

/** 內部使用的登入結果；user 含 ip，只給舊版路徑沿用舊格式 */
export interface AuthSession {
  user: UserVO;
  accessToken: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async getUser(uid: string): Promise<UserVO> {
    const user = await this.databaseService.userRepository.findByUid(uid);
    if (!user) throw new UserNotFoundError(`user ${uid} not found`);
    return user;
  }

  /** 改密碼需要目前密碼（只用簡訊登入、還沒設定過密碼的帳號除外）；改密碼後舊 token 全部失效 */
  async updateProfile(uid: string, body: UpdateMeBody): Promise<AuthSession> {
    const credential = await this.databaseService.userRepository.findCredentialByUid(uid);
    if (!credential) throw new UserNotFoundError(`user ${uid} not found`);

    let passwordHash: string | undefined;
    if (body.password) {
      await this.assertCurrentPassword(credential, body.currentPassword);
      passwordHash = await hashPassword(body.password);
    }

    await this.databaseService.userRepository.updateProfile(uid, { displayName: body.displayName, email: body.email, passwordHash });
    if (passwordHash) this.logger.log(`password changed, previous tokens revoked: uid=${uid}`);
    return this.createSession(uid);
  }

  /** 依資料庫最新資料簽發 token */
  async createSession(uid: string): Promise<AuthSession> {
    const user = await this.getUser(uid);
    const accessToken = this.tokenService.sign({ uid: user.uid, tv: user.tokenVersion });
    return { user, accessToken };
  }

  toProfile(user: UserVO): UserProfileResponse {
    return {
      uid: user.uid,
      phone: user.phone,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      hasPassword: user.hasPassword,
    };
  }

  private async assertCurrentPassword(credential: UserCredentialVO, currentPassword?: string): Promise<void> {
    if (!credential.passwordHash) return;
    const result = await verifyPassword(currentPassword ?? '', credential.passwordHash);
    if (result.isValid) return;
    this.logger.warn(`password change rejected, current password mismatch: uid=${credential.uid}`);
    throw new CurrentPasswordMismatchError('current password is incorrect');
  }
}

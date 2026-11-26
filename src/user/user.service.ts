import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserVO } from '../database/repositories/interfaces/user.interface';
import { hashPassword } from '../common/utils/password.util';
import { TokenService } from '../token/token.service';
import { UpdateMeBody, UserProfileResponse } from './dtos/user.dto';

export class UserNotFoundError extends Error {}

/** 內部使用的登入結果；user 含 ip，只給舊版路徑沿用舊格式 */
export interface AuthSession {
  user: UserVO;
  accessToken: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async getUser(uid: string): Promise<UserVO> {
    const user = await this.databaseService.userRepository.findByUid(uid);
    if (!user) throw new UserNotFoundError(`user ${uid} not found`);
    return user;
  }

  async updateProfile(uid: string, body: UpdateMeBody): Promise<AuthSession> {
    await this.getUser(uid);
    await this.databaseService.userRepository.updateProfile(uid, {
      displayName: body.displayName,
      email: body.email,
      passwordHash: body.password ? await hashPassword(body.password) : undefined,
    });
    return this.createSession(uid);
  }

  /** 依資料庫最新資料簽發 token（payload 欄位與舊版相容） */
  async createSession(uid: string): Promise<AuthSession> {
    const user = await this.getUser(uid);
    const accessToken = this.tokenService.sign({
      uid: user.uid,
      phone: user.phone,
      ip: user.ip,
      name: user.name,
      email: user.email,
      displayName: user.displayName,
    });
    return { user, accessToken };
  }

  toProfile(user: UserVO): UserProfileResponse {
    return { uid: user.uid, phone: user.phone, name: user.name, displayName: user.displayName, email: user.email };
  }
}

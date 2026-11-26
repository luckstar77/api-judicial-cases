import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FirebaseService } from '../firebase/firebase.service';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { maskHalf } from '../common/utils/mask.util';
import { normalizeTaiwanPhone } from '../common/utils/phone.util';
import { AuthSession, UserService } from '../user/user.service';
import { AuthResultResponse } from '../user/dtos/user.dto';
import { RegisterBody } from './dtos/auth.dto';

export class InvalidCredentialsError extends Error {}
export class PhoneAlreadyRegisteredError extends Error {}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) {}

  /** 手機簡訊驗證登入：第一次使用的手機會建立帳號（尚未設定密碼） */
  async verifyPhone(firebaseToken: string, ip: string): Promise<AuthSession> {
    const identity = await this.firebaseService.verifyPhoneToken(firebaseToken);
    await this.databaseService.userRepository.upsertPhoneUser({ uid: identity.uid, phone: identity.phone, ip });
    return this.userService.createSession(identity.uid);
  }

  async register(body: RegisterBody, ip: string): Promise<AuthSession> {
    const identity = await this.firebaseService.verifyPhoneToken(body.firebaseToken);
    if (await this.databaseService.userRepository.hasPasswordForPhone(identity.phone)) {
      throw new PhoneAlreadyRegisteredError('phone already registered');
    }

    const input = {
      uid: identity.uid,
      phone: identity.phone,
      ip,
      passwordHash: await hashPassword(body.password),
      name: body.name,
      displayName: body.displayName,
      email: body.email,
    };
    // 先做過簡訊驗證 → 補上密碼與資料；沒有這個 uid → 新增。同一個 uid 已有密碼（含並發重複送出）→ 衝突
    // 同手機但不同 uid 的舊資料不搬動主鍵（留言 / 按讚以 uid 關聯），登入時會優先取有密碼的那筆
    const isRegistered =
      (await this.databaseService.userRepository.completeRegistration(input)) || (await this.databaseService.userRepository.insertRegisteredUser(input));
    if (!isRegistered) throw new PhoneAlreadyRegisteredError('phone already registered');

    this.logger.log(`user registered: uid=${identity.uid}`);
    return this.userService.createSession(identity.uid);
  }

  /** 手機 + 密碼登入；舊版 SHA-256 密碼驗證成功後自動升級為 scrypt */
  async login(phone: string, password: string): Promise<AuthSession> {
    const credential = await this.databaseService.userRepository.findCredentialByPhone(normalizeTaiwanPhone(phone));
    const result = await verifyPassword(password, credential?.passwordHash);
    if (!credential || !result.isValid) {
      this.logger.warn(`login failed: phone=${maskHalf(normalizeTaiwanPhone(phone))}`);
      throw new InvalidCredentialsError('invalid phone or password');
    }

    if (result.needsRehash) {
      await this.databaseService.userRepository.updatePasswordHash(credential.uid, await hashPassword(password));
    }
    return this.userService.createSession(credential.uid);
  }

  toResult(session: AuthSession): AuthResultResponse {
    return { user: this.userService.toProfile(session.user), accessToken: session.accessToken };
  }
}

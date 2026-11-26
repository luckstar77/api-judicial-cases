import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

/** JWT 只放 uid 與 token 版本；個資不放進 token（任何拿到 token 的人都能解碼） */
export interface TokenPayload {
  uid: string;
  /** users.tokenVersion；舊版 token 沒有這個欄位，視為 0 */
  tv?: number;
}

export interface AuthenticatedSession {
  uid: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign({ uid: payload.uid, tv: payload.tv ?? 0 });
  }

  /** 簽章、效期、帳號存在、token 版本都要通過；失敗回傳 undefined，由 guard 決定拒絕或視為訪客 */
  async authenticate(token: string): Promise<AuthenticatedSession | undefined> {
    const payload = this.verify(token);
    if (!payload) return undefined;
    const currentVersion = await this.databaseService.userRepository.findTokenVersion(payload.uid);
    if (currentVersion === undefined || currentVersion !== (payload.tv ?? 0)) return undefined;
    return { uid: payload.uid };
  }

  private verify(token: string): TokenPayload | undefined {
    try {
      const payload = this.jwtService.verify<Partial<TokenPayload>>(token);
      if (typeof payload.uid !== 'string' || payload.uid.length === 0) return undefined;
      return { uid: payload.uid, tv: typeof payload.tv === 'number' ? payload.tv : undefined };
    } catch {
      return undefined;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** JWT payload 與舊版相容：舊 token（1 年效期）在新版仍然有效 */
export interface TokenPayload {
  uid: string;
  phone: string;
  ip?: string;
  name?: string;
  email?: string;
  displayName?: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign({ ...payload });
  }

  /** 驗證失敗回傳 undefined，由 guard 決定要拒絕或視為訪客 */
  verify(token: string): TokenPayload | undefined {
    try {
      const payload = this.jwtService.verify<Partial<TokenPayload>>(token);
      if (typeof payload.uid !== 'string' || payload.uid.length === 0) return undefined;
      return { ...payload, uid: payload.uid, phone: payload.phone ?? '' };
    } catch {
      return undefined;
    }
  }
}

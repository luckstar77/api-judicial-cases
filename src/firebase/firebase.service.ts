import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { EnvironmentVariables } from '../config/env.validation';

export class InvalidFirebaseTokenError extends Error {}

export interface VerifiedPhoneIdentity {
  uid: string;
  phone: string;
}

/** 驗證前端 Firebase 手機簡訊登入取得的 ID token */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App;

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  onModuleInit(): void {
    const [existing] = getApps();
    this.app = existing ?? initializeApp({ projectId: this.config.get('FIREBASE_PROJECT_ID', { infer: true }) });
  }

  async verifyPhoneToken(idToken: string): Promise<VerifiedPhoneIdentity> {
    try {
      const decoded = await getAuth(this.app).verifyIdToken(idToken);
      if (!decoded.uid || !decoded.phone_number) throw new InvalidFirebaseTokenError('token has no phone number');
      return { uid: decoded.uid, phone: decoded.phone_number };
    } catch (error) {
      if (error instanceof InvalidFirebaseTokenError) throw error;
      this.logger.warn(`Firebase token verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new InvalidFirebaseTokenError('firebase token verification failed');
    }
  }
}

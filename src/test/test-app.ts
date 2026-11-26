import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { FirebaseService } from '../firebase/firebase.service';
import { mockFirebaseService } from '../firebase/test/mock';
import { StorageService } from '../storage/storage.service';
import { mockStorageService } from '../storage/test/mock';
import { TokenService } from '../token/token.service';

export interface TestApp {
  app: NestExpressApplication;
  dataSource: DataSource;
  tokenService: TokenService;
}

/** 完整 AppModule + 真實 MySQL；只 mock 外部服務（Firebase、S3） */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FirebaseService)
    .useValue(mockFirebaseService)
    .overrideProvider(StorageService)
    .useValue(mockStorageService)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();

  return { app, dataSource: app.get(DataSource), tokenService: app.get(TokenService) };
}

/** 產生登入用的 Authorization header（使用者需已存在，token 版本預設 0） */
export function bearer(tokenService: TokenService, uid: string, tokenVersion = 0): string {
  return `Bearer ${tokenService.sign({ uid, tv: tokenVersion })}`;
}

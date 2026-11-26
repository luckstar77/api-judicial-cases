import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { EnvironmentVariables } from './config/env.validation';

export const API_DEFAULT_VERSION = '1';
const DEFAULT_CORS_ORIGINS = ['https://rental.imallenlai.com', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:3011'];
const CORS_MAX_AGE_SECONDS = 86400;
const SWAGGER_PATH = 'apidocs';

function parseOrigins(value?: string): string[] {
  if (!value) return DEFAULT_CORS_ORIGINS;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** main.ts 與 E2E 測試共用，確保測試與正式環境行為一致 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // 只信任本機 nginx 加上的 X-Forwarded-For，使用者偽造的 header 不會影響 req.ip
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: parseOrigins(config.get('CORS_ORIGINS', { infer: true })),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: CORS_MAX_AGE_SECONDS,
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('租屋通 API')
      .setDescription('租屋糾紛判決查詢與網友回報。v1 回應格式：{ status, code, data }，未加版號的舊路徑僅供舊前端使用。')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}

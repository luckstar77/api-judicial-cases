import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CaseModule } from './cases/case.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { JudgmentModule } from './judgment/judgment.module';
import { LegacyModule } from './legacy/legacy.module';
import { StatsModule } from './stats/stats.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';

const THROTTLE_WINDOW_MS = 60_000;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [{ ttl: THROTTLE_WINDOW_MS, limit: config.get('THROTTLE_LIMIT', { infer: true }) }],
    }),
    DatabaseModule,
    TokenModule,
    AuthModule,
    UserModule,
    JudgmentModule,
    CaseModule,
    StatsModule,
    HealthModule,
    LegacyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
  ],
})
export class AppModule {}

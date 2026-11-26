import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables } from '../config/env.validation';
import { DatabaseService } from './database.service';
import { ENTITIES } from './entities';
import { CaseCommentRepository } from './repositories/case-comment/case-comment.repository';
import { CaseLikeRepository } from './repositories/case-like/case-like.repository';
import { CaseRepository } from './repositories/case/case.repository';
import { JudgmentCommentRepository } from './repositories/judgment-comment/judgment-comment.repository';
import { JudgmentLikeRepository } from './repositories/judgment-like/judgment-like.repository';
import { JudgmentRepository } from './repositories/judgment/judgment.repository';
import { UserRepository } from './repositories/user/user.repository';
import { buildTypeOrmOptions } from './typeorm-options';

const REPOSITORIES = [
  UserRepository,
  JudgmentRepository,
  JudgmentCommentRepository,
  JudgmentLikeRepository,
  CaseRepository,
  CaseCommentRepository,
  CaseLikeRepository,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildTypeOrmOptions({
          host: config.get('DB_HOST', { infer: true }),
          port: config.get('DB_PORT', { infer: true }),
          username: config.get('DB_USER', { infer: true }),
          password: config.get('DB_PASSWORD', { infer: true }),
          database: config.get('DB_NAME', { infer: true }),
          // 正式環境由部署流程在備份後執行 migration；測試環境啟動時自動執行
          runMigrations: config.get('NODE_ENV', { infer: true }) === 'test',
        }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  providers: [...REPOSITORIES, DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

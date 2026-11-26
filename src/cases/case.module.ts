import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { CaseCommentController } from './case-comment.controller';
import { CaseCommentService } from './case-comment.service';
import { CaseLikeController } from './case-like.controller';
import { CaseLikeService } from './case-like.service';
import { CaseController } from './case.controller';
import { CaseService } from './case.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [CaseController, CaseCommentController, CaseLikeController],
  providers: [CaseService, CaseCommentService, CaseLikeService],
  exports: [CaseService, CaseCommentService, CaseLikeService],
})
export class CaseModule {}

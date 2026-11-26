import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JudgmentCommentController } from './judgment-comment.controller';
import { JudgmentCommentService } from './judgment-comment.service';
import { JudgmentLikeController } from './judgment-like.controller';
import { JudgmentLikeService } from './judgment-like.service';
import { JudgmentController } from './judgment.controller';
import { JudgmentService } from './judgment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [JudgmentController, JudgmentCommentController, JudgmentLikeController],
  providers: [JudgmentService, JudgmentCommentService, JudgmentLikeService],
  exports: [JudgmentService, JudgmentCommentService, JudgmentLikeService],
})
export class JudgmentModule {}

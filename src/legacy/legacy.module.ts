import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CaseModule } from '../cases/case.module';
import { JudgmentModule } from '../judgment/judgment.module';
import { UserModule } from '../user/user.module';
import { LegacyController } from './legacy.controller';
import { LegacyService } from './legacy.service';

@Module({
  imports: [AuthModule, UserModule, JudgmentModule, CaseModule],
  controllers: [LegacyController],
  providers: [LegacyService],
})
export class LegacyModule {}

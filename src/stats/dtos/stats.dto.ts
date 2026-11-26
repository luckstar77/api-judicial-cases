import { ApiProperty } from '@nestjs/swagger';

export class StatsResponse {
  @ApiProperty({ description: '判決總數' })
  judgmentCount: number;

  @ApiProperty({ description: '網友回報案例數' })
  caseCount: number;

  @ApiProperty({ description: '會員數' })
  userCount: number;
}

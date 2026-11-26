import { ApiProperty } from '@nestjs/swagger';

export class HealthResponse {
  @ApiProperty({ description: '資料庫連線狀態', enum: ['up', 'down'] })
  db: 'up' | 'down';
}

export class LegacyHealthResponse {
  @ApiProperty({ description: '舊版健康檢查', example: 'OK' })
  status: string;
}

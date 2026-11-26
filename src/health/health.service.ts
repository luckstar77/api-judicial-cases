import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export class DatabaseUnavailableError extends Error {}

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async checkDatabase(): Promise<void> {
    try {
      await this.databaseService.ping();
    } catch (error) {
      throw new DatabaseUnavailableError(`database ping failed: ${String(error)}`);
    }
  }
}

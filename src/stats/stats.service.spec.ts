import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { DatabaseUnavailableError, HealthService } from '../health/health.service';
import { StatsService } from './stats.service';

describe('StatsService / HealthService', () => {
  let statsService: StatsService;
  let healthService: HealthService;
  let databaseService: MockDatabaseService;

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [StatsService, HealthService, { provide: DatabaseService, useValue: databaseService }],
    }).compile();
    statsService = moduleRef.get(StatsService);
    healthService = moduleRef.get(HealthService);
  });

  it('should aggregate counts', async () => {
    databaseService.judgmentRepository.count.mockResolvedValue(10);
    databaseService.caseRepository.count.mockResolvedValue(2);
    databaseService.userRepository.count.mockResolvedValue(5);

    await expect(statsService.getStats()).resolves.toEqual({ judgmentCount: 10, caseCount: 2, userCount: 5 });
  });

  it('should wrap database failures in DatabaseUnavailableError', async () => {
    databaseService.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(healthService.checkDatabase()).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

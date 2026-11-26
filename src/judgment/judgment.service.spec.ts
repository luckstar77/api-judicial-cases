import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { JUDGMENT_CITIES } from '../common/utils/city.util';
import { JudgmentNotFoundError, JudgmentService } from './judgment.service';

describe('JudgmentService', () => {
  let service: JudgmentService;
  let databaseService: MockDatabaseService;

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({ providers: [JudgmentService, { provide: DatabaseService, useValue: databaseService }] }).compile();
    service = moduleRef.get(JudgmentService);
  });

  describe('search', () => {
    it('should wrap repository rows with pagination meta', async () => {
      databaseService.judgmentRepository.searchByName.mockResolvedValue({ rows: [{ id: 'J1' }], totalCount: 21 });

      const result = await service.search({ keyword: '王小明', page: 2, limit: 10 });

      expect(databaseService.judgmentRepository.searchByName).toHaveBeenCalledWith('王小明', { page: 2, limit: 10 });
      expect(result.meta).toMatchObject({ page: 2, take: 10, totalCount: 21, pageCount: 3, hasNextPage: true });
    });
  });

  describe('getDetail', () => {
    it('should throw JudgmentNotFoundError when the judgment does not exist', async () => {
      databaseService.judgmentRepository.findDetailById.mockResolvedValue(undefined);

      await expect(service.getDetail('missing')).rejects.toBeInstanceOf(JudgmentNotFoundError);
    });
  });

  describe('assertExists', () => {
    it('should throw JudgmentNotFoundError when the judgment does not exist', async () => {
      databaseService.judgmentRepository.existsById.mockResolvedValue(false);

      await expect(service.assertExists('missing')).rejects.toBeInstanceOf(JudgmentNotFoundError);
    });

    it('should resolve when the judgment exists', async () => {
      databaseService.judgmentRepository.existsById.mockResolvedValue(true);

      await expect(service.assertExists('J1')).resolves.toBeUndefined();
    });
  });

  describe('getWarningNames', () => {
    it('should normalize the city and swap a reversed rent range', async () => {
      databaseService.judgmentRepository.findWarningNames.mockResolvedValue([]);

      await service.getWarningNames({ city: '台北市', rentMin: 20000, rentMax: 5000, minCount: 3 });

      expect(databaseService.judgmentRepository.findWarningNames).toHaveBeenCalledWith({
        city: '臺北',
        rentMin: 5000,
        rentMax: 20000,
        minCount: 3,
        limit: 100,
      });
    });
  });

  describe('getCityStats', () => {
    it('should only count the known judgment cities', async () => {
      databaseService.judgmentRepository.countByCity.mockResolvedValue([]);

      await service.getCityStats();

      expect(databaseService.judgmentRepository.countByCity).toHaveBeenCalledWith(JUDGMENT_CITIES);
    });
  });

  describe('findFullTextByName', () => {
    it('should trim the keyword', async () => {
      databaseService.judgmentRepository.findFullTextByName.mockResolvedValue([]);

      await service.findFullTextByName('  王小明 ');

      expect(databaseService.judgmentRepository.findFullTextByName).toHaveBeenCalledWith('王小明');
    });
  });
});

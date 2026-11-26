import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { StorageService } from '../storage/storage.service';
import { mockStorageService } from '../storage/test/mock';
import { buildSearchKeywords, CaseNotFoundError, CaseService } from './case.service';

describe('CaseService', () => {
  let service: CaseService;
  let databaseService: MockDatabaseService;
  const row = {
    id: 1,
    title: '欠租',
    content: '內容',
    location: '台北市',
    district: '大安區',
    rent: 10000,
    defendantName: '王小明',
    defendantPhone: '0912345678',
    defendantIdNo: 'A123456789',
    imageUrls: [],
    authorDisplayName: '房東',
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const body = { title: 't', content: 'c', location: '台北市', district: '大安區', rent: 1000, defendantName: '某人' };

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [CaseService, { provide: DatabaseService, useValue: databaseService }, { provide: StorageService, useValue: mockStorageService }],
    }).compile();
    service = moduleRef.get(CaseService);
  });

  describe('buildSearchKeywords', () => {
    it('should include both local and E.164 mobile formats', () => {
      expect(buildSearchKeywords('0911-222-333')).toEqual(expect.arrayContaining(['0911-222-333', '0911222333', '+886911222333']));
      expect(buildSearchKeywords('+886911222333')).toEqual(expect.arrayContaining(['+886911222333', '0911222333']));
    });

    it('should include an upper-cased id number', () => {
      expect(buildSearchKeywords('a123456789')).toEqual(expect.arrayContaining(['a123456789', 'A123456789']));
    });

    it('should not produce duplicates', () => {
      expect(buildSearchKeywords('王小明')).toEqual(['王小明']);
    });
  });

  describe('list', () => {
    it('should mask defendant fields', async () => {
      databaseService.caseRepository.findPage.mockResolvedValue({ rows: [row], totalCount: 1 });

      const result = await service.list({ page: 1, limit: 10, city: '台北市' });

      expect(databaseService.caseRepository.findPage).toHaveBeenCalledWith({ page: 1, limit: 10, city: '台北市', district: undefined });
      expect(result.list[0]).toMatchObject({ defendantName: '王*明', defendantPhone: '09*****678', defendantIdNo: 'A1*****789' });
    });
  });

  describe('search', () => {
    it('should search with keyword variants', async () => {
      databaseService.caseRepository.searchPage.mockResolvedValue({ rows: [], totalCount: 0 });

      await service.search({ keyword: '0911222333', page: 1, limit: 10 });

      expect(databaseService.caseRepository.searchPage).toHaveBeenCalledWith({ page: 1, limit: 10, keywords: ['0911222333', '+886911222333'] });
    });
  });

  describe('getDetail', () => {
    it('should throw CaseNotFoundError when the case does not exist', async () => {
      databaseService.caseRepository.findById.mockResolvedValue(undefined);

      await expect(service.getDetail(404)).rejects.toBeInstanceOf(CaseNotFoundError);
    });
  });

  describe('create', () => {
    it('should skip S3 when there are no images', async () => {
      databaseService.caseRepository.create.mockResolvedValue({ id: 5 });

      await expect(service.create({ userId: 'u', ip: '1.1.1.1', body, images: [] })).resolves.toEqual({ id: 5 });
      expect(mockStorageService.uploadCaseImages).not.toHaveBeenCalled();
      expect(databaseService.caseRepository.create).toHaveBeenCalledWith(expect.objectContaining({ plaintiffId: 'u', imageUrls: [], ip: '1.1.1.1' }));
    });

    it('should store the uploaded image urls', async () => {
      databaseService.caseRepository.create.mockResolvedValue({ id: 6 });
      const image = { buffer: Buffer.from('x'), mimetype: 'image/png' };

      await service.create({ userId: 'u', ip: '1.1.1.1', body, images: [image] });

      expect(databaseService.caseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrls: ['https://test-bucket.s3.amazonaws.com/cases/test-0.jpg'] }),
      );
    });
  });

  describe('countPages', () => {
    it('should round up the page count', async () => {
      databaseService.caseRepository.count.mockResolvedValue(21);

      await expect(service.countPages(10)).resolves.toBe(3);
    });
  });
});

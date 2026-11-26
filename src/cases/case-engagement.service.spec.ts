import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { CaseCommentCreateError, CaseCommentService } from './case-comment.service';
import { CaseLikeService } from './case-like.service';
import { CaseNotFoundError, CaseService } from './case.service';
import { mockCaseService } from './test/mock';

describe('CaseCommentService / CaseLikeService', () => {
  let commentService: CaseCommentService;
  let likeService: CaseLikeService;
  let databaseService: MockDatabaseService;

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CaseCommentService,
        CaseLikeService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: CaseService, useValue: mockCaseService },
      ],
    }).compile();
    commentService = moduleRef.get(CaseCommentService);
    likeService = moduleRef.get(CaseLikeService);
    mockCaseService.assertExists.mockResolvedValue(undefined);
  });

  describe('CaseCommentService', () => {
    it('should create and return the masked comment', async () => {
      databaseService.caseCommentRepository.create.mockResolvedValue({ id: 3 });
      databaseService.caseCommentRepository.findById.mockResolvedValue({ id: 3, content: 'hi', ip: '2001:db8:85a3::1', createdAt: new Date(0) });

      const result = await commentService.create({ caseId: 1, userId: 'u', content: 'hi', ip: '2001:db8:85a3::1' });

      expect(databaseService.caseCommentRepository.create).toHaveBeenCalledWith({ targetId: 1, userId: 'u', content: 'hi', ip: '2001:db8:85a3::1' });
      expect(result).toMatchObject({ id: 3, ipMasked: '2001:db8:*' });
    });

    it('should not create a comment for a missing case', async () => {
      mockCaseService.assertExists.mockRejectedValue(new CaseNotFoundError('missing'));

      await expect(commentService.create({ caseId: 404, userId: 'u', content: 'hi', ip: '1.1.1.1' })).rejects.toBeInstanceOf(CaseNotFoundError);
      expect(databaseService.caseCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw CaseCommentCreateError when the created row cannot be read back', async () => {
      databaseService.caseCommentRepository.create.mockResolvedValue({ id: 3 });
      databaseService.caseCommentRepository.findById.mockResolvedValue(undefined);

      await expect(commentService.create({ caseId: 1, userId: 'u', content: 'hi', ip: '1.1.1.1' })).rejects.toBeInstanceOf(CaseCommentCreateError);
    });

    it('should list comments in the requested order', async () => {
      databaseService.caseCommentRepository.findByCaseId.mockResolvedValue([]);

      await commentService.list(1, 'DESC');

      expect(databaseService.caseCommentRepository.findByCaseId).toHaveBeenCalledWith(1, 'DESC');
    });
  });

  describe('CaseLikeService', () => {
    it('should report the current user like state', async () => {
      databaseService.caseLikeRepository.countByCaseId.mockResolvedValue(2);
      databaseService.caseLikeRepository.exists.mockResolvedValue(true);

      await expect(likeService.getState(1, 'u')).resolves.toEqual({ likeCount: 2, liked: true });
    });

    it('should not toggle a missing case', async () => {
      mockCaseService.assertExists.mockRejectedValue(new CaseNotFoundError('missing'));

      await expect(likeService.toggle(404, 'u')).rejects.toBeInstanceOf(CaseNotFoundError);
      expect(databaseService.caseLikeRepository.toggle).not.toHaveBeenCalled();
    });
  });
});

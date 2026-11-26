import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { JudgmentCommentCreateError, JudgmentCommentService } from './judgment-comment.service';
import { JudgmentLikeService } from './judgment-like.service';
import { JudgmentNotFoundError, JudgmentService } from './judgment.service';
import { mockJudgmentService } from './test/mock';

describe('JudgmentCommentService / JudgmentLikeService', () => {
  let commentService: JudgmentCommentService;
  let likeService: JudgmentLikeService;
  let databaseService: MockDatabaseService;
  const comment = { id: 7, content: '內容', authorDisplayName: '甲', ip: '35.78.212.43', createdAt: new Date('2025-01-01T00:00:00Z') };

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        JudgmentCommentService,
        JudgmentLikeService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: JudgmentService, useValue: mockJudgmentService },
      ],
    }).compile();
    commentService = moduleRef.get(JudgmentCommentService);
    likeService = moduleRef.get(JudgmentLikeService);
    mockJudgmentService.assertExists.mockResolvedValue(undefined);
  });

  describe('JudgmentCommentService', () => {
    it('should mask the ip when listing comments', async () => {
      databaseService.judgmentCommentRepository.findByFilesetId.mockResolvedValue([comment]);

      const result = await commentService.list('J1');

      expect(databaseService.judgmentCommentRepository.findByFilesetId).toHaveBeenCalledWith('J1', 'ASC');
      expect(result).toEqual([{ id: 7, content: '內容', authorDisplayName: '甲', ipMasked: '35.78.*.*', createdAt: comment.createdAt }]);
    });

    it('should not create a comment for a missing judgment', async () => {
      mockJudgmentService.assertExists.mockRejectedValue(new JudgmentNotFoundError('missing'));

      await expect(commentService.create({ filesetId: 'missing', userId: 'u', content: 'c', ip: '1.1.1.1' })).rejects.toBeInstanceOf(JudgmentNotFoundError);
      expect(databaseService.judgmentCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw JudgmentCommentCreateError when the created row cannot be read back', async () => {
      databaseService.judgmentCommentRepository.create.mockResolvedValue({ id: 9 });
      databaseService.judgmentCommentRepository.findById.mockResolvedValue(undefined);

      await expect(commentService.create({ filesetId: 'J1', userId: 'u', content: 'c', ip: '1.1.1.1' })).rejects.toBeInstanceOf(JudgmentCommentCreateError);
    });
  });

  describe('JudgmentLikeService', () => {
    it('should report liked=false for anonymous users without querying likes', async () => {
      databaseService.judgmentLikeRepository.countByFilesetId.mockResolvedValue(3);

      await expect(likeService.getState('J1')).resolves.toEqual({ likeCount: 3, liked: false });
      expect(databaseService.judgmentLikeRepository.exists).not.toHaveBeenCalled();
    });

    it('should return the new state after toggling', async () => {
      databaseService.judgmentLikeRepository.toggle.mockResolvedValue(true);
      databaseService.judgmentLikeRepository.countByFilesetId.mockResolvedValue(1);

      await expect(likeService.toggle('J1', 'u')).resolves.toEqual({ likeCount: 1, liked: true });
    });

    it('should not toggle a missing judgment', async () => {
      mockJudgmentService.assertExists.mockRejectedValue(new JudgmentNotFoundError('missing'));

      await expect(likeService.toggle('missing', 'u')).rejects.toBeInstanceOf(JudgmentNotFoundError);
      expect(databaseService.judgmentLikeRepository.toggle).not.toHaveBeenCalled();
    });
  });
});

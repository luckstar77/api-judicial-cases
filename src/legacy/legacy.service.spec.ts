import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { CaseCommentService } from '../cases/case-comment.service';
import { CaseLikeService } from '../cases/case-like.service';
import { CaseService } from '../cases/case.service';
import { mockCaseService } from '../cases/test/mock';
import { JudgmentCommentService } from '../judgment/judgment-comment.service';
import { JudgmentLikeService } from '../judgment/judgment-like.service';
import { JudgmentService } from '../judgment/judgment.service';
import { mockJudgmentService } from '../judgment/test/mock';
import { mockUserService } from '../user/test/mock';
import { UserService } from '../user/user.service';
import { LegacyService } from './legacy.service';

describe('LegacyService', () => {
  let service: LegacyService;
  const mockAuthService = { verifyPhone: jest.fn(), register: jest.fn(), login: jest.fn() };
  const mockCommentService = { list: jest.fn(), create: jest.fn() };
  const mockLikeService = { getState: jest.fn(), toggle: jest.fn() };
  const session = { user: { uid: 'u', phone: '+886912345678', ip: '1.2.3.4', name: 'n', email: 'e@example.com', displayName: 'd' }, accessToken: 'tok' };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LegacyService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: JudgmentService, useValue: mockJudgmentService },
        { provide: JudgmentCommentService, useValue: mockCommentService },
        { provide: JudgmentLikeService, useValue: mockLikeService },
        { provide: CaseService, useValue: mockCaseService },
        { provide: CaseCommentService, useValue: mockCommentService },
        { provide: CaseLikeService, useValue: mockLikeService },
      ],
    }).compile();
    service = moduleRef.get(LegacyService);
  });

  it('should return an empty list without querying when search is empty', async () => {
    await expect(service.searchJudgments(undefined)).resolves.toEqual([]);
    expect(mockJudgmentService.findFullTextByName).not.toHaveBeenCalled();
  });

  it('should map warning names to the legacy { name, count } shape', async () => {
    mockJudgmentService.getWarningNames.mockResolvedValue([{ name: '惡房客', judgmentCount: 3 }]);

    await expect(service.getNameCounts({ city: '臺北', rentMin: 0, rentMax: 1000, score: 2 })).resolves.toEqual([{ name: '惡房客', count: 3 }]);
    expect(mockJudgmentService.getWarningNames).toHaveBeenCalledWith({ city: '臺北', rentMin: 0, rentMax: 1000, minCount: 2 });
  });

  it('should cap the legacy page size at 50', async () => {
    mockCaseService.list.mockResolvedValue({ list: [], meta: {} });
    mockCaseService.countPages.mockResolvedValue(1);

    await service.listCases(1, 1000);
    await service.countCasePages(1000);

    expect(mockCaseService.list).toHaveBeenCalledWith({ page: 1, limit: 50 });
    expect(mockCaseService.countPages).toHaveBeenCalledWith(50);
  });

  it('should expose the author display name as displayName', async () => {
    mockCaseService.search.mockResolvedValue({ list: [{ id: 1, authorDisplayName: '房東' }], meta: {} });

    await expect(service.searchCases('王小明')).resolves.toEqual([{ id: 1, authorDisplayName: '房東', displayName: '房東' }]);
  });

  it('should list judgment comments newest first with filesetId', async () => {
    mockCommentService.list.mockResolvedValue([{ id: 1, content: 'c', authorDisplayName: 'd', ipMasked: '1.2.*.*', createdAt: new Date(0) }]);

    await expect(service.listJudgmentComments('J1')).resolves.toEqual([{ id: 1, content: 'c', displayName: 'd', createdAt: new Date(0), filesetId: 'J1' }]);
    expect(mockCommentService.list).toHaveBeenCalledWith('J1', 'DESC');
  });

  it('should return the legacy user shape with token', async () => {
    mockAuthService.login.mockResolvedValue(session);

    await expect(service.login('0912345678', 'pw')).resolves.toEqual({ ...session.user, token: 'tok' });
  });

  it('should translate legacy register body to the new register input', async () => {
    mockAuthService.register.mockResolvedValue(session);

    await service.register({ token: 'firebase', password: 'password1', name: 'n', displayName: 'd', email: 'e@example.com' }, '1.2.3.4');

    expect(mockAuthService.register).toHaveBeenCalledWith(
      { firebaseToken: 'firebase', password: 'password1', name: 'n', displayName: 'd', email: 'e@example.com' },
      '1.2.3.4',
    );
  });
});

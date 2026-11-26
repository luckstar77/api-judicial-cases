import { Injectable } from '@nestjs/common';
import { JudgmentFullTextVO } from '../database/repositories/interfaces/judgment.interface';
import { AuthService } from '../auth/auth.service';
import { CaseCommentService } from '../cases/case-comment.service';
import { CaseLikeService } from '../cases/case-like.service';
import { CaseService } from '../cases/case.service';
import { CaseListItemResponse, CreateCaseBody } from '../cases/dtos/case.dto';
import { CommentResponse } from '../common/dtos/engagement.dto';
import { UploadableFile } from '../storage/storage.service';
import { JudgmentCommentService } from '../judgment/judgment-comment.service';
import { JudgmentLikeService } from '../judgment/judgment-like.service';
import { JudgmentService } from '../judgment/judgment.service';
import { AuthSession, UserService } from '../user/user.service';
import {
  LEGACY_MAX_PAGE_SIZE,
  LegacyCaseComment,
  LegacyComment,
  LegacyJudgmentComment,
  LegacyNameCount,
  LegacyNameQuery,
  LegacyRegisterBody,
  LegacyUpdateUserBody,
  LegacyUser,
  LegacyUserWithToken,
} from './dtos/legacy.dto';

export interface LegacyCase extends CaseListItemResponse {
  displayName?: string;
}

export interface LegacyCaseDetail extends LegacyCase {
  comments: LegacyCaseComment[];
}

/**
 * 舊版（未加版號）路徑的轉接層：呼叫新版 service，再轉回舊前端認得的格式。
 * 新前端上線且 CloudFront 快取過期後即可移除整個 legacy 模組。
 */
@Injectable()
export class LegacyService {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly judgmentService: JudgmentService,
    private readonly judgmentCommentService: JudgmentCommentService,
    private readonly judgmentLikeService: JudgmentLikeService,
    private readonly caseService: CaseService,
    private readonly caseCommentService: CaseCommentService,
    private readonly caseLikeService: CaseLikeService,
  ) {}

  // ---------- 判決 ----------

  async searchJudgments(search?: string): Promise<JudgmentFullTextVO[]> {
    if (!search) return [];
    return this.judgmentService.findFullTextByName(search);
  }

  async getNameCounts(query: LegacyNameQuery): Promise<LegacyNameCount[]> {
    const names = await this.judgmentService.getWarningNames({
      city: query.city,
      rentMin: query.rentMin,
      rentMax: query.rentMax,
      minCount: query.score,
    });
    return names.map((item) => ({ name: item.name, count: item.judgmentCount }));
  }

  async listJudgmentComments(filesetId: string): Promise<LegacyJudgmentComment[]> {
    const comments = await this.judgmentCommentService.list(filesetId, 'DESC');
    return comments.map((comment) => ({ ...toLegacyComment(comment), filesetId }));
  }

  async createJudgmentComment(userId: string, filesetId: string, content: string, ip: string): Promise<LegacyJudgmentComment> {
    const comment = await this.judgmentCommentService.create({ filesetId, userId, content, ip });
    return { ...toLegacyComment(comment), filesetId };
  }

  async toggleJudgmentLike(filesetId: string, userId: string): Promise<boolean> {
    return (await this.judgmentLikeService.toggle(filesetId, userId)).liked;
  }

  async countJudgmentLikes(filesetId: string): Promise<number> {
    return (await this.judgmentLikeService.getState(filesetId)).likeCount;
  }

  async getJudgmentLikeStatus(filesetId: string, userId: string): Promise<boolean> {
    return (await this.judgmentLikeService.getState(filesetId, userId)).liked;
  }

  // ---------- 網友回報案例 ----------

  async listCases(page: number, pageSize: number): Promise<LegacyCase[]> {
    const limit = Math.min(pageSize, LEGACY_MAX_PAGE_SIZE);
    const { list } = await this.caseService.list({ page, limit });
    return list.map(toLegacyCase);
  }

  countCasePages(pageSize: number): Promise<number> {
    return this.caseService.countPages(Math.min(pageSize, LEGACY_MAX_PAGE_SIZE));
  }

  async searchCases(keyword: string): Promise<LegacyCase[]> {
    const { list } = await this.caseService.search({ keyword, page: 1, limit: LEGACY_MAX_PAGE_SIZE });
    return list.map(toLegacyCase);
  }

  async getCaseDetail(id: number): Promise<LegacyCaseDetail> {
    const [detail, comments] = await Promise.all([this.caseService.getDetail(id), this.caseCommentService.list(id, 'ASC')]);
    return { ...toLegacyCase(detail), comments: comments.map((comment) => ({ ...toLegacyComment(comment), caseId: id })) };
  }

  async createCase(userId: string, ip: string, body: CreateCaseBody, images: UploadableFile[]): Promise<{ id: number }> {
    return this.caseService.create({ userId, ip, body, images });
  }

  async createCaseComment(caseId: number, userId: string, content: string, ip: string): Promise<void> {
    await this.caseCommentService.create({ caseId, userId, content, ip });
  }

  async toggleCaseLike(caseId: number, userId: string): Promise<boolean> {
    return (await this.caseLikeService.toggle(caseId, userId)).liked;
  }

  async getCaseLikeStatus(caseId: number, userId: string): Promise<boolean> {
    return (await this.caseLikeService.getState(caseId, userId)).liked;
  }

  // ---------- 使用者 ----------

  async getUser(uid: string): Promise<LegacyUser> {
    return toLegacyUser(await this.userService.getUser(uid));
  }

  async updateUser(uid: string, body: LegacyUpdateUserBody): Promise<LegacyUserWithToken> {
    return toLegacySession(await this.userService.updateProfile(uid, body));
  }

  async verify(token: string, ip: string): Promise<LegacyUserWithToken> {
    return toLegacySession(await this.authService.verifyPhone(token, ip));
  }

  async register(body: LegacyRegisterBody, ip: string): Promise<LegacyUserWithToken> {
    const session = await this.authService.register(
      { firebaseToken: body.token, password: body.password, name: body.name, displayName: body.displayName, email: body.email },
      ip,
    );
    return toLegacySession(session);
  }

  async login(phone: string, password: string): Promise<LegacyUserWithToken> {
    return toLegacySession(await this.authService.login(phone, password));
  }
}

function toLegacyComment(comment: CommentResponse): LegacyComment {
  return { id: comment.id, content: comment.content, displayName: comment.authorDisplayName, createdAt: comment.createdAt };
}

function toLegacyCase(item: CaseListItemResponse): LegacyCase {
  return { ...item, displayName: item.authorDisplayName };
}

/** 舊前端會讀自己的 ip，因此只有本人資料保留 ip */
function toLegacyUser(user: LegacyUser): LegacyUser {
  return { uid: user.uid, phone: user.phone, ip: user.ip, name: user.name, email: user.email, displayName: user.displayName };
}

function toLegacySession(session: AuthSession): LegacyUserWithToken {
  return { ...toLegacyUser(session.user), token: session.accessToken };
}

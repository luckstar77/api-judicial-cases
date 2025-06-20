import { db } from '../db'; // 既有的 Knex 實例 (import knex({ ... }))

/*********************************
 * 型別定義
 *********************************/
export interface CreateCaseInput {
  plaintiffId: string;
  title: string;
  content: string;
  location: string;
  district: string;
  defendantName: string;
  defendantPhone: string;
  defendantIdNo: string;
  imageUrls: string[]; // S3 連結陣列
}

export interface CaseRow {
  id: number;
  plaintiffId: string;
  title: string;
  content: string;
  location: string;
  district: string;
  defendantName: string;
  defendantPhone: string;
  defendantIdNo: string;
  imageUrls: string; // 資料庫內存 JSON 字串
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  email?: string;
  phone?: string;
  ip?: string;
}

export interface CaseCommentRow {
  id: number;
  caseId: number;
  userId: string;
  content: string;
  createdAt: Date;
}

/*********************************
 * Service 實作
 *********************************/

/** 新增案例，回傳自動遞增 id */
export const createCase = async (data: CreateCaseInput): Promise<number> => {
    const [id] = await db<CaseRow>('cases').insert({
        plaintiffId: data.plaintiffId,
        title: data.title,
        content: data.content,
        location: data.location,
        district: data.district,
        defendantName: data.defendantName,
        defendantPhone: data.defendantPhone,
        defendantIdNo: data.defendantIdNo,
        imageUrls: JSON.stringify(data.imageUrls),
    });
    return Number(id);
};

/** 取案例列表（依建立時間倒序） */
export const listCases = async (): Promise<CaseRow[]> => {
    const rows = await db<CaseRow>('cases as c')
        .join('users as u', 'c.plaintiffId', 'u.uid')
        .select(
            'c.id',
            'c.plaintiffId',
            'c.title',
            'c.content',
            'c.location',
            'c.district',
            'c.defendantName',
            'c.defendantPhone',
            'c.defendantIdNo',
            'c.imageUrls',
            'c.createdAt',
            'c.updatedAt',
            'u.name',
            'u.email',
            'u.phone',
            'u.ip'
        )
        .orderBy('c.createdAt', 'desc');

    return rows;
};

/** 取單一案例詳情，包含留言與按讚數 */
export const getCaseDetail = async (id: number) => {
    const caseRow = await db<CaseRow>('cases as c')
        .join('users as u', 'c.plaintiffId', 'u.uid')
        .select(
            'c.id',
            'c.plaintiffId',
            'c.title',
            'c.content',
            'c.location',
            'c.district',
            'c.defendantName',
            'c.defendantPhone',
            'c.defendantIdNo',
            'c.imageUrls',
            'c.createdAt',
            'c.updatedAt',
            'u.name',
            'u.email',
            'u.phone',
            'u.ip'
        )
        .where('c.id', id)
        .first();
    if (!caseRow) return null;

    // 留言
    const comments = await db<CaseCommentRow>('caseComments')
        .where({ caseId: id })
        .orderBy('createdAt');

    // 按讚數
    const [{ likeCount }] = await db('caseLikes')
        .where({ caseId: id })
        .count('* as likeCount');

    return {
        ...caseRow,
        comments,
        likeCount: Number(likeCount || 0),
    };
};

/** 新增留言 */
export const addComment = async (
    caseId: number,
    userId: string,
    content: string
): Promise<void> => {
    await db('caseComments').insert({ caseId, userId, content });
};

/** 按讚 / 取消按讚，回傳按讚後狀態 */
export const toggleLike = async (
    caseId: number,
    userId: string
): Promise<boolean> => {
    const liked = await db('caseLikes').where({ caseId, userId }).first();
    if (liked) {
        await db('caseLikes').where({ caseId, userId }).delete();
        return false;
    }
    await db('caseLikes').insert({ caseId, userId });
    return true;
};
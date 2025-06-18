import { Request, Response } from 'express';
import { RequestWithUser } from '../middlewares/checkLoggedIn';
import * as caseService from '../services/caseService';
import { safeJsonParse } from '../utils/safeJsonParse';

/** 建立新案例 */
export const createCase = async (req: RequestWithUser, res: Response) => {
    try {
        const { title, content, defendantName, defendantPhone, defendantIdNo } = req.body;
        const imageUrls = (
      req.files as Express.MulterS3.File[] | undefined
        )?.map((f) => `https://${f.bucket}.s3.amazonaws.com/${f.key}`) ?? [];

        const id = await caseService.createCase({
            plaintiffId: req.user!.uid,
            title,
            content,
            defendantName,
            defendantPhone,
            defendantIdNo,
            imageUrls,
        });

        return res.status(201).json({ id });
    } catch (err) {
        console.error('createCase error:', err);
        return res.status(500).json({ message: 'createCase failed' });
    }
};

/** 案例列表 */
export const listCases = async (_req: Request, res: Response) => {
    try {
        const rows = await caseService.listCases();
        return res.json(rows);
    } catch (err) {
        console.error('listCases error:', err);
        return res.status(500).json({ message: 'listCases failed' });
    }
};

/** 案例詳情 */
export const getCaseDetail = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const detail = await caseService.getCaseDetail(id);
        if (!detail) return res.status(404).json({ message: 'not found' });
        return res.json(detail);
    } catch (err) {
        console.error('getCaseDetail error:', err);
        return res.status(500).json({ message: 'getCaseDetail failed' });
    }
};

/** 新增留言 */
export const addComment = async (req: RequestWithUser, res: Response) => {
    try {
        await caseService.addComment(
            Number(req.params.id),
      req.user!.uid,
      req.body.content
        );
        return res.status(201).end();
    } catch (err) {
        console.error('addComment error:', err);
        return res.status(500).json({ message: 'addComment failed' });
    }
};

/** 按讚 / 取消按讚 */
export const toggleLike = async (req: RequestWithUser, res: Response) => {
    try {
        const liked = await caseService.toggleLike(
            Number(req.params.id),
      req.user!.uid
        );
        return res.json({ liked });
    } catch (err) {
        console.error('toggleLike error:', err);
        return res.status(500).json({ message: 'toggleLike failed' });
    }
};
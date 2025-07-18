import { Request, Response } from 'express';
import { RequestWithUser } from '../middlewares/checkLoggedIn';
import * as caseService from '../services/caseService';
import getClientIp from '../utils/getClientIp';
import maskHalf from '../utils/maskHalf';

/** 建立新案例 */
export const createCase = async (req: RequestWithUser, res: Response) => {
    try {
        const {
            title,
            content,
            location,
            district,
            rent,
            defendantName,
            defendantPhone,
            defendantIdNo,
        } = req.body;

        if (!location) {
            return res.status(400).json({ message: 'location is required' });
        }
        const rentValue = parseInt(rent, 10);
        if (Number.isNaN(rentValue)) {
            return res.status(400).json({ message: 'invalid rent' });
        }
        const imageUrls = (
      req.files as Express.MulterS3.File[] | undefined
        )?.map((f) => `https://${f.bucket}.s3.amazonaws.com/${f.key}`) ?? [];
        const ip = getClientIp(req);

        const id = await caseService.createCase({
            plaintiffId: req.user!.uid,
            title,
            content,
            defendantName,
            location,
            district,
            rent: rentValue,
            defendantPhone,
            defendantIdNo,
            imageUrls,
            ip,
        });

        return res.status(201).json({ id });
    } catch (err) {
        console.error('createCase error:', err);
        return res.status(500).json({ message: 'createCase failed' });
    }
};

/** 案例列表 */
export const listCases = async (req: Request, res: Response) => {
    try {
        const { page, pageSize } = req.query as {
            page?: string;
            pageSize?: string;
        };

        let pageNum = page ? parseInt(page, 10) : 1;
        if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;

        let size = pageSize ? parseInt(pageSize, 10) : 10;
        if (Number.isNaN(size) || size < 1) size = 10;

        const rows = await caseService.listCases(pageNum, size);
        const masked = rows.map((r) => ({
            ...r,
            defendantName: maskHalf(r.defendantName),
            defendantPhone: maskHalf(r.defendantPhone),
            defendantIdNo: maskHalf(r.defendantIdNo),
        }));
        return res.json(masked);
    } catch (err) {
        console.error('listCases error:', err);
        return res.status(500).json({ message: 'listCases failed' });
    }
};

/** 取得案例總頁數 */
export const getTotalPages = async (req: Request, res: Response) => {
    try {
        const { pageSize } = req.query as { pageSize?: string };
        let size = pageSize ? parseInt(pageSize, 10) : 10;
        if (Number.isNaN(size) || size < 1) size = 10;

        const totalCount = await caseService.countCases();
        const totalPages = Math.ceil(totalCount / size);
        return res.json({ totalPages });
    } catch (err) {
        console.error('getTotalPages error:', err);
        return res.status(500).json({ message: 'getTotalPages failed' });
    }
};

/** 案例詳情 */
export const getCaseDetail = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const detail = await caseService.getCaseDetail(id);
        if (!detail) return res.status(404).json({ message: 'not found' });
        const masked = {
            ...detail,
            defendantName: maskHalf(detail.defendantName),
            defendantPhone: maskHalf(detail.defendantPhone),
            defendantIdNo: maskHalf(detail.defendantIdNo),
        };
        return res.json(masked);
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
            req.body.content,
            getClientIp(req)
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

/** 取得是否已按讚 */
export const getLikeStatus = async (
    req: RequestWithUser,
    res: Response
) => {
    try {
        const liked = await caseService.getLikeStatus(
            Number(req.params.id),
            req.user!.uid
        );
        return res.json({ liked });
    } catch (err) {
        console.error('getLikeStatus error:', err);
        return res.status(500).json({ message: 'getLikeStatus failed' });
    }
};

/** 依照關鍵字搜尋被告姓名、電話或身分證字號 */
export const searchCases = async (req: Request, res: Response) => {
    try {
        const { search } = req.params as { search?: string };

        if (!search) {
            return res.status(400).json({ message: 'missing parameter' });
        }

        const rows = await caseService.searchCases(search);
        const masked = rows.map((r) => ({
            ...r,
            defendantName: maskHalf(r.defendantName),
            defendantPhone: maskHalf(r.defendantPhone),
            defendantIdNo: maskHalf(r.defendantIdNo),
        }));
        return res.json(masked);
    } catch (err) {
        console.error('searchCases error:', err);
        return res.status(500).json({ message: 'searchCases failed' });
    }
};


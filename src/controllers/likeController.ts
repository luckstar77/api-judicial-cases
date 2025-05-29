import { Request, Response } from 'express';
import { toggleLike, getLikeCount, getLikeStatus } from '../services/likeService';
import { RequestWithUser } from '../middleware/checkLoggedIn';

export const handleToggleLike = async (req: RequestWithUser, res: Response) => {
    const userId = req.user?.uid;
    const { filesetId } = req.params;
    try {
        const liked = await toggleLike(userId, filesetId);
        res.json({ liked });
    } catch (error) {
        res.status(500).json({ error: '伺服器錯誤' });
    }
};

export const handleGetLikeCount = async (req: Request, res: Response) => {
    const { filesetId } = req.params;
    try {
        const count = await getLikeCount(filesetId);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: '伺服器錯誤' });
    }
};

export const handleGetLikeStatus = async (req: RequestWithUser, res: Response) => {
    const userId = req.user?.uid;
    const filesetId = req.params.filesetId;
    const liked = await getLikeStatus(userId, filesetId);
    res.json({ liked });
};
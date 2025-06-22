import { Request, Response } from 'express';
import commentService from '../services/commentService';
import { RequestWithUser } from '../middlewares/checkLoggedIn';
import getClientIp from '../utils/getClientIp';

export default {
    async addComment(req: RequestWithUser, res: Response) {
        const userId = req.user!.uid;
        const { filesetId, content } = req.body;
        const ip = getClientIp(req);
        const comment = await commentService.createComment(userId, filesetId, content, ip);
        res.status(201).json(comment);
    },

    async getCommentsByFileset(req: Request, res: Response) {
        const { filesetId } = req.params;
        const comments = await commentService.getCommentsByFileset(filesetId);
        res.json(comments);
    }
};
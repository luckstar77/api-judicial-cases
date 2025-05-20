import { Request, Response } from 'express';
import { RequestWithUser } from '../middleware/checkLoggedIn';
import updateUser from '../utils/updateUser';
import {signJwt} from '../utils/jwt';

export default {
    async getUser(req: RequestWithUser, res: Response) {
        res.json(req.user);
    },

    async createUser(req: RequestWithUser, res: Response) {
        
        await updateUser(req.user?.uid, {
            ...req.body,
        });
        req.user = {...req.user, ...req.body};
        const {name, phone, email, uid, ip } = req.user!;
        const userPayload = {name, phone, email, uid, ip};
        const token = signJwt(userPayload);
        res.status(201).json({...userPayload, token});
    }
};

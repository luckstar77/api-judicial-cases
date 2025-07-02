import { Request, Response } from 'express';
import { RequestWithUser } from '../middlewares/checkLoggedIn';
import updateUser from '../utils/updateUser';
import { signJwt } from '../utils/jwt';
import { db } from '../db';
import crypto from 'crypto';
import hashPassword from '../utils/hashPassword';
import firebaseApp from '../lib/firebase';

export default {
    async getUser(req: RequestWithUser, res: Response) {
        res.json(req.user);
    },

    async createUser(req: RequestWithUser, res: Response) {
        
        await updateUser(req.user!.uid, {
            ...req.body,
        });
        req.user = {...req.user, ...req.body};
        const {name, phone, email, uid, ip } = req.user!;
        const userPayload = {name, phone, email, uid, ip};
        const token = signJwt(userPayload);
        res.status(201).json({...userPayload, token});
    }
};

export const verify = async (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

    if (!token) {
        return res.status(400).json({ message: 'missing token' });
    }

    try {
        const decodedToken = await firebaseApp.auth().verifyIdToken(token);
        const { uid, phone_number: phone } = decodedToken as {
            uid?: string;
            phone_number?: string;
        };

        if (!uid || !phone) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        await db.raw(
            `INSERT INTO users (uid, ip, phone)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                ip = VALUES(ip),
                phone = VALUES(phone)`,
            [uid, ip, phone]
        );

        const { name, email } = await db('users')
            .select('name', 'email')
            .where({ uid })
            .first();

        const userPayload = { uid, phone, ip, name, email };
        const jwtToken = signJwt(userPayload);

        return res
            .status(200)
            .json({ uid, phone, ip, name, email, token: jwtToken });
    } catch (err) {
        console.error('verify error:', err);
        return res.status(401).json({ message: 'Token verification failed.' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { token, password, name, displayName, email } = req.body as {
            token?: string;
            password?: string;
            name?: string;
            displayName?: string;
            email?: string;
        };

        if (!token) {
            return res.status(400).json({ message: 'missing token' });
        }

        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

        // 驗證簡訊 token
        const decodedToken = await firebaseApp.auth().verifyIdToken(token);
        const { uid, phone_number: phone } = decodedToken as { uid: string; phone_number?: string };

        if (!uid || !phone) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'password must be at least 8 characters' });
        }
        if (!name || !displayName || !email) {
            return res.status(400).json({ message: 'missing required fields' });
        }

        const existing = await db('users').where({ phone }).first();
        if (existing && existing.password) {
            return res.status(409).json({ message: 'phone already exists' });
        }

        const hashed = hashPassword(password);

        if (existing) {
            await db('users')
                .where({ phone })
                .update({ uid, ip, password: hashed, name, displayName, email });
        } else {
            await db('users').insert({
                uid,
                phone,
                ip,
                password: hashed,
                name,
                displayName,
                email,
            });
        }

        const userPayload = { uid, phone, ip, name, email };
        const jwtToken = signJwt(userPayload);

        return res.status(201).json({ uid, phone, name, displayName, email, token: jwtToken });
    } catch (err) {
        console.error('register error:', err);
        return res.status(500).json({ message: 'register failed' });
    }
};

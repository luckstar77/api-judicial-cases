import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface UserPayload extends JwtPayload {
    name: string;
    phone: string;
    email: string;
    ip: string;
}

// 定義一個新的介面，擴展了 Express 的 Request 介面
export interface RequestWithUser extends Request {
    user?: UserPayload;
}

export default function checkLoggedIn(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
        if (err) return res.sendStatus(403);

        // 檢查解碼的值是否是一個對象，並具有 user 屬性
        if (typeof user === 'object' && user !== null && user) {
            // 你現在可以將解碼的對象分配給你的 RequestWithUser 類型
            req.user = user as UserPayload;
        } else {
            // 處理錯誤情況
        }

        next(); // 繼續處理請求
    });
}

import './env';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import getCases from './utils/getCases';
import getName from './utils/getName';
import firebaseApp from './lib/firebase';
import router from './routes';
import { healthCheck, db } from './db';
import errorHandler from './middlewares/errorHandler';

declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any }; // 用你的使用者類型來替換 `{ [key: string]: any }`
    }
}
(async () => {
    try {
        await healthCheck();            // 驅動、連線 OK ?
        // buildExpressApp() ...
    } catch (err) {
        console.error('DB 連線失敗：', err);
        process.exit(1);
    }

    const app = express();
    app.set('trust proxy', true);

    app.use(cors({ credentials: true }));
    // Parse JSON bodies for this app. Equivalent to bodyParser.json()
    app.use(express.json());

    // Parse URL-encoded bodies for this app. Equivalent to bodyParser.urlencoded({ extended: true })
    app.use(express.urlencoded({ extended: true }));

    app.get('/cases', async function (req, res) {
        const { search } = req.query as { search: string };
        const cases = await getCases(search);
        res.send(cases);
    });

    app.get('/name', async function (req, res) {
        const { city, rentMin, rentMax, score } = req.query as {
            city: string;
            rentMin: string;
            rentMax: string;
            score: string;
        };
        const name = await getName({
            city,
            rentMin: parseInt(rentMin),
            rentMax: parseInt(rentMax),
            score: parseInt(score),
        });
        res.send(name);
    });

    app.post('/verify', async (req: Request, res: Response) => {
        const { token }: { token: string; phone: string } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
            // 驗證簡訊 token
            const decodedToken = await firebaseApp.auth().verifyIdToken(token);

            // 如果驗證成功，將電話號碼存入到 MySQL
            const { uid, phone_number: phone } = decodedToken;
            if (uid) {
                // 使用您的 knex 實例來存儲 phone
                // 假設您已經有一個名為 "users" 的表格，並且有一個名為 "phone" 的列
                await db.raw(
                    `
                INSERT INTO users (uid, ip, phone)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                ip = VALUES(ip),
                phone = VALUES(phone)
            `,
                    [uid, ip, phone]
                );
                const {name, email} = await db('users')
                    .select('name', 'email')
                    .where({ uid })
                    .first();
            

                const userPayload = {
                    uid,
                    phone,
                    ip,
                    name,
                    email,
                };
                const token = jwt.sign(userPayload, process.env.JWT_SECRET!, {
                    expiresIn: '1y', // 設定過期時間
                });

                res.status(200).send({
                    uid,
                    phone,
                    ip,
                    name,
                    email,
                    token,
                });
            } else {
                res.status(401).send({ message: 'Invalid token.' });
            }
        } catch (error) {
            console.error(error);
            // 如果驗證失敗，返回錯誤信息
            res.status(401).send({ message: 'Token verification failed.' });
        }
    });
    
    app.use(router);

    // 健康檢查路由
    app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

    app.use(errorHandler);

    app.listen(3010);
})();

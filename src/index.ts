import './env';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import { Knex } from 'knex';
import * as knex from './db/knex';
import getCases from './utils/getCases';
import getName from './utils/getName';
import firebaseApp from './lib/firebase';
import router from './routes/userRoutes';

const config: Knex.Config = {
    client: 'mysql2',
    connection: {
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'rental',
    },
    log: {
        warn(message) {
            console.log(message);
        },
        error(message) {
            console.log(message);
        },
        deprecate(message) {
            console.log(message);
        },
        debug(message) {
            console.log(message);
        },
    },
};

declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any }; // 用你的使用者類型來替換 `{ [key: string]: any }`
    }
}
(async () => {
    await knex.init(config);
    const knexClient = await knex.getClient();
    const app = express();

    app.use(cors({ credentials: true }));
    // Parse JSON bodies for this app. Equivalent to bodyParser.json()
    app.use(express.json());

    // Parse URL-encoded bodies for this app. Equivalent to bodyParser.urlencoded({ extended: true })
    app.use(express.urlencoded({ extended: true }));

    app.use(require('./middleware/errorHandler').default);

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
                await knexClient.raw(
                    `
                INSERT INTO users (uid, ip, phone)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                ip = VALUES(ip),
                phone = VALUES(phone)
            `,
                    [uid, ip, phone]
                );
                const {name, email} = await knexClient('users')
                    .select('name', 'email')
                    .where({ uid })
                    .first();
            

                const userPayload = {
                    uid,
                    phone,
                    ip,
                    name, 
                    email
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
    
    app.use(router)
    //     // At this point, we know the user is logged in

    //     res.send(req.user);
    // });

    // app.post('/user', checkLoggedIn, async (req:RequestWithUser, res) => {
    //     await updateUser(req.user?.uid, {
    //         ...req.body,
    //     });
    //     req.user = {...req.user, ...req.body};
    //     const {name, phone, email, uid, ip } = req.user!;
    //     const userPayload = {name, phone, email, uid, ip};
    //     const token = jwt.sign(userPayload, process.env.JWT_SECRET!, {
    //         expiresIn: '1y', // 設定過期時間
    //     });
    //     res.send({...userPayload, token});
    // });

    app.listen(3010);
})();

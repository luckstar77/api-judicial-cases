import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import KnexSessionStoreFactory from 'connect-session-knex';

import { Knex } from 'knex';
import * as knex from './db/knex';
import getCases from './utils/getCases';
import getName from './utils/getName';
import firebaseApp from './lib/firebase';
import checkLoggedIn from './middleware/checkLoggedIn';

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

const KnexSessionStore = KnexSessionStoreFactory(session);

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
    // Session Middleware Configuration
    app.use(
        session({
            secret: process.env.SESSION_SECRET!,
            cookie: {
                maxAge: 7 * 24 * 60 * 60 * 1000,
            },
            store: new KnexSessionStore({
                knex: knexClient,
            }),
            resave: false,
            saveUninitialized: false,
        })
    );

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

                // Save the phone number to session
                req.session.user = {
                    uid,
                    phone,
                    ip,
                };

                res.status(200).send({
                    uid,
                    phone,
                    ip,
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

    app.get('/user', checkLoggedIn, (req, res) => {
        // At this point, we know the user is logged in
        res.send(req.session.user);
    });

    app.listen(3010);
})();

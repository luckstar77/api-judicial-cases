import './env';
import express, { Request, Response } from 'express';
import cors from 'cors';

import getCases from './utils/getCases';
import getName from './utils/getName';
import router from './routes';
import { healthCheck } from './db';
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

    
    app.use(router);

    // 健康檢查路由
    app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

    app.use(errorHandler);

    app.listen(3010);
})();

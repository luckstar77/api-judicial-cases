import express from 'express';
import cors from 'cors';

import { Knex } from 'knex';
import * as knex from './db/knex';
import getCases from './utils/getCases';

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

(async () => {
    await knex.init(config);
    const app = express();
    app.use(cors({ credentials: true }));

    app.get('/cases', async function (req, res) {
        const { search } = req.query as { search: string };
        const cases = await getCases(search);
        res.send(cases);
    });

    app.listen(3100);
})();

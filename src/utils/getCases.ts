import * as knex from '../db/knex';

const TABLE_WIN: Map = {
    被告: 'plaintiff',
    原告: 'defendant',
};

interface Map {
    [key: string]: any;
    [index: number]: any;
}

export default async (search: string) => {
    const knexClient = await knex.getClient();

    const result = await knexClient('judicialFileset')
        .whereILike('plaintiff', `%${search}%`)
        .orWhereILike('defendant', `%${search}%`)
        .select('id', 'plaintiff', 'defendant', 'rent', 'city', 'win', 'jyear');
    return result;
};

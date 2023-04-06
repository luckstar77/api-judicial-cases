import * as knex from '../db/knex';

interface Map {
    [key: string]: any;
    [index: number]: any;
}

export default async (query: {
    rentMin: number;
    rentMax: number;
    city: string;
    score: number;
}) => {
    const { rentMin, rentMax, city, score } = query;
    const knexClient = await knex.getClient();

    const subquery = knexClient('judicialFileset')
        .select(
            knexClient.raw(
                'CASE WHEN win != \'plaintiff\' THEN plaintiff ELSE defendant END AS name'
            ),
            'win'
        )
        .whereBetween('rent', [rentMin, rentMax])
        .where({ city });

    const result = knexClient
        .select('name', knexClient.raw('COUNT(*) as count'))
        .from(subquery.as('subquery'))
        .groupBy('name')
        .havingRaw('COUNT(*) > ?', score);

    return result;
};
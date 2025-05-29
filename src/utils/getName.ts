import {db} from '../db';

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

    const subquery = db('judicialFileset')
        .select(
            db.raw(
                'CASE WHEN win != \'plaintiff\' THEN plaintiff ELSE defendant END AS name'
            ),
            'win'
        )
        .whereBetween('rent', [rentMin, rentMax])
        .where({ city });

    const result = await db
        .select('name', db.raw('COUNT(*) as count'))
        .from(subquery.as('subquery'))
        .whereNot('name', 'like', '%○%') // Add this line
        .whereRaw('LENGTH(name) <= 12')
        .groupBy('name')
        .havingRaw('COUNT(*) >= ?', score)
        .orderBy('count', 'desc'); // Add this line

    return result;
};

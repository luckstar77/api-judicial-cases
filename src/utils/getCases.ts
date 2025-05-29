import {db} from '../db';

interface Map {
    [key: string]: any;
    [index: number]: any;
}

export default async (search: string) => {

    const result = await db('judicialFileset')
        .whereILike('plaintiff', search)
        .orWhereILike('defendant', search)
        .select(
            'id',
            'plaintiff',
            'defendant',
            'rent',
            'city',
            'win',
            'jyear',
            'jfull',
            'jtitle'
        );
    return result;
};

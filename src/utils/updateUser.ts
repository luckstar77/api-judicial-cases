import {db} from '../db';

export default async (
    uid: string,
    user: { displayName?: string; email?: string; password?: string }
) => {
    const result = await db('users').where({ uid }).update({ ...user });
    return result;
};

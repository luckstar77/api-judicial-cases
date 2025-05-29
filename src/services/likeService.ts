import { db } from '../db';

export const toggleLike = async (userId: string, filesetId: string): Promise<boolean> => {
    const existing = await db('likes').where({ userId, filesetId }).first();

    if (existing) {
        await db('likes').where({ userId, filesetId }).delete();
        return false;
    } else {
        await db('likes').insert({ userId, filesetId });
        return true;
    }
};

export const getLikeCount = async (filesetId: string): Promise<number> => {
    const result = (await db('likes')
        .count('* as count')
        .where({ filesetId })
        .first()) as { count?: number } | undefined;
    const countValue = result?.count ?? 0;
    return Number(countValue);
};

export const getLikeStatus = async (userId: string, filesetId: string) => {
    const record = await db('likes')
        .where({ userId, filesetId })
        .first();
    return Boolean(record);
};

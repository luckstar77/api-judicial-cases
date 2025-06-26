import { db } from '../db';
import { Comment } from '../types/comment';          // 自訂型別

export default {
    async insert(userId: string, filesetId: string, content: string, ip: string): Promise<Comment> {
        // ① 插入並取得 insertId
        const [result] = await db('comments').insert({
            userId,
            filesetId,
            content,
            ip,
        });

        const insertId = typeof result === 'number'
            ? result                         // MySQL 8
            : (result as any).insertId;      // 部分 mysql2 回傳型態

        // ② 取回含使用者資訊的完整列
        const created = await db<Comment>('comments as c')
            .join('users as u', 'c.userId', 'u.uid')
            .select('c.*', 'u.name', 'u.email')
            .where('c.id', insertId)
            .first();

        return created!;

    },

    async findByFileset(filesetId: string): Promise<Comment[]> {
        return db<Comment>('comments as c')
            .join('users as u', 'c.userId', 'u.uid')
            .select('c.*', 'u.name', 'u.email')
            .where('c.filesetId', filesetId)
            .orderBy('c.createdAt', 'desc');
    },
};

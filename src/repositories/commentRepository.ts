import { db } from '../db';
import { Comment } from '../types/comment';          // 自訂型別

export default {
    async insert(userId: string, filesetId: string, content: string): Promise<Comment> {
        const [created] = await db<Comment>('comments')
            .insert({
                userId,
                filesetId,
                content,
            })
            .returning('*');
        return created;
    },

    async findByFileset(filesetId: string): Promise<Comment[]> {
        return db<Comment>('comments as c')
            .join('users as u', 'c.userId', 'u.uid')
            .select('c.*', 'u.name', 'u.email', 'u.phone')
            .where('c.filesetId', filesetId)
            .orderBy('c.createdAt', 'desc');
    },
};

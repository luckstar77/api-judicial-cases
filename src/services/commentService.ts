import commentRepository from '../repositories/commentRepository';

export default {
    async createComment(userId: string, filesetId: string, content: string) {
        return commentRepository.insert(userId, filesetId, content);
    },

    async getCommentsByFileset(filesetId: string) {
        return commentRepository.findByFileset(filesetId);
    }
};
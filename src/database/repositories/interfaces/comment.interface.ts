export interface CommentVO {
  id: number;
  content: string;
  authorDisplayName?: string;
  ip?: string;
  createdAt: Date;
}

export type CommentOrder = 'ASC' | 'DESC';

export interface CreateCommentInput<TTarget> {
  targetId: TTarget;
  userId: string;
  content: string;
  ip: string;
}

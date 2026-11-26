import { CommentVO } from '../../database/repositories/interfaces/comment.interface';
import { CommentResponse } from '../dtos/engagement.dto';
import { maskIp } from './mask.util';

export function toCommentResponse(comment: CommentVO): CommentResponse {
  return {
    id: comment.id,
    content: comment.content,
    authorDisplayName: comment.authorDisplayName,
    ipMasked: maskIp(comment.ip),
    createdAt: comment.createdAt,
  };
}

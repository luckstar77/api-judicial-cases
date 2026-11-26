import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentResponse {
  @ApiProperty({ description: '留言 ID' })
  id: number;

  @ApiProperty({ description: '留言內容' })
  content: string;

  @ApiPropertyOptional({ description: '留言者暱稱' })
  authorDisplayName?: string;

  @ApiPropertyOptional({ description: '遮罩後的 IP（例：35.78.*.*）' })
  ipMasked?: string;

  @ApiProperty({ description: '留言時間', format: 'date-time' })
  createdAt: Date;
}

export class CommentListResponse {
  @ApiProperty({ type: [CommentResponse], description: '留言列表' })
  list: CommentResponse[];
}

export class LikeStateResponse {
  @ApiProperty({ description: '按讚數' })
  likeCount: number;

  @ApiProperty({ description: '目前使用者是否已按讚（未登入為 false）' })
  liked: boolean;
}

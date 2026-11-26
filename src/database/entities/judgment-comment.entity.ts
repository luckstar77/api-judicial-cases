import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 既有資料表 comments：判決的留言 */
@Entity('comments')
export class JudgmentComment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'char', length: 32 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  filesetId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;
}

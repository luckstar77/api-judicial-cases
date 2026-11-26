import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 既有資料表 likes：判決的按讚 */
@Entity('likes')
export class JudgmentLike {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'char', length: 32 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  filesetId: string;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  createdAt?: Date;
}

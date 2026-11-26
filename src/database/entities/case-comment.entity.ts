import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 既有資料表 caseComments：網友回報案例的留言 */
@Entity('caseComments')
export class CaseComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  caseId: number;

  @Column({ type: 'char', length: 32, nullable: true })
  userId?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @CreateDateColumn({ type: 'datetime', nullable: true })
  createdAt?: Date;
}

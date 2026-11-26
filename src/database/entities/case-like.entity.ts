import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 既有資料表 caseLikes：網友回報案例的按讚 */
@Entity('caseLikes')
export class CaseLike {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  caseId: number;

  @Column({ type: 'char', length: 32, nullable: true })
  userId?: string;
}

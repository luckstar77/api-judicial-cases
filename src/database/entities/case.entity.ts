import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 既有資料表 cases：網友回報的租屋案例 */
@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'char', length: 32, nullable: true })
  plaintiffId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  district?: string;

  @Column({ type: 'int' })
  rent: number;

  @Column({ type: 'char', length: 32, nullable: true })
  defendantName?: string;

  @Column({ type: 'char', length: 16, nullable: true })
  defendantPhone?: string;

  @Column({ type: 'char', length: 16, nullable: true })
  defendantIdNo?: string;

  @Column({ type: 'json', nullable: true })
  imageUrls?: string[];

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}

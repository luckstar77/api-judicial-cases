import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 既有資料表 users（沿用正式環境 schema，不套用 snake_case 命名） */
@Entity('users')
export class User {
  @PrimaryColumn({ type: 'char', length: 32 })
  uid: string;

  @Column({ type: 'char', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @Column({ type: 'char', length: 32, nullable: true })
  name?: string;

  @Column({ type: 'char', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName?: string;
}

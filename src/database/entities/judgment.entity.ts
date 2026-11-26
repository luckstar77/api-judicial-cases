import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 既有資料表 judicialFileset：司法院公開的租賃判決（由 crawl-judicial-cases 寫入） */
@Entity('judicialFileset')
export class Judgment {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  jcase?: string;

  @Column({ type: 'date' })
  jdate: string;

  @Column({ type: 'longtext' })
  jfull: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  jno?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  jpdf?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  jtitle?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  jyear?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  plaintiff?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defendant?: string;

  @Column({ type: 'int', nullable: true })
  rent?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  district?: string;

  /** 資料庫為 enum('plaintiff','defendant')，程式端以字串處理 */
  @Column({ type: 'varchar', length: 10, nullable: true })
  win?: string;
}

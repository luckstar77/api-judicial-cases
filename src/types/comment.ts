/**
 * Comment row as it exists在資料庫 (snake_case) ──
 * 若在 service／controller 層要改 camelCase，可再額外宣告 ViewModel。
 */
export interface Comment {
  /** 自增主鍵 */
  id: number;

  /** FK → users.uid ；型別必須與 users.uid 完全一致 */
  userId: string;

  /** FK → judicialFileset.id */
  filesetId: string;

  /** 留言內容 */
  content: string;

  /** 建立時間（由 MySQL TIMESTAMP 或 DATETIME 轉成 JS Date） */
  createdAt: Date;

  /** 由 JOIN users 取得（可選） */
  name?: string;
  email?: string;
  phone?: string;
  /** 使用者留言時的 IP */
  ip?: string;
}

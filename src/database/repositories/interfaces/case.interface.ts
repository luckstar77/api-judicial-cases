import { PageQueryVO } from './common.interface';

export interface CaseListItemVO {
  id: number;
  title: string;
  content: string;
  location?: string;
  district?: string;
  rent: number;
  defendantName?: string;
  defendantPhone?: string;
  defendantIdNo?: string;
  imageUrls: string[];
  authorDisplayName?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseListFilterVO extends PageQueryVO {
  city?: string;
  district?: string;
}

export interface CaseSearchFilterVO extends PageQueryVO {
  /** 任一欄位完全相符即命中（姓名 / 電話 / 身分證） */
  keywords: string[];
}

export interface CreateCaseInput {
  plaintiffId: string;
  title: string;
  content: string;
  location: string;
  district?: string;
  rent: number;
  defendantName: string;
  defendantPhone?: string;
  defendantIdNo?: string;
  imageUrls: string[];
  ip: string;
}

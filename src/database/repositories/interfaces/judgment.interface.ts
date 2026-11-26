export interface JudgmentListItemVO {
  id: string;
  jyear?: string;
  jcase?: string;
  jno?: string;
  jdate: string;
  jtitle?: string;
  plaintiff?: string;
  defendant?: string;
  rent?: number;
  city?: string;
  district?: string;
  win?: string;
  likeCount: number;
  commentCount: number;
}

export interface JudgmentDetailVO extends JudgmentListItemVO {
  jfull: string;
  jpdf?: string;
}

/** 舊版 GET /cases?search= 的回傳欄位 */
export interface JudgmentFullTextVO {
  id: string;
  plaintiff?: string;
  defendant?: string;
  rent?: number;
  city?: string;
  win?: string;
  jyear?: string;
  jfull: string;
  jtitle?: string;
}

export interface WarningNameQueryVO {
  city: string;
  rentMin: number;
  rentMax: number;
  minCount: number;
  limit: number;
}

export interface WarningNameVO {
  name: string;
  judgmentCount: number;
}

export interface CityJudgmentCountVO {
  city: string;
  judgmentCount: number;
}

export interface PageQueryVO {
  page: number;
  limit: number;
}

export interface PagedVO<T> {
  rows: T[];
  totalCount: number;
}

export interface CreatedVO {
  id: number;
}

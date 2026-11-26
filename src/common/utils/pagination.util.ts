export interface PaginationMeta {
  take: number;
  page: number;
  pageCount: number;
  itemCount: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface Paginated<T> {
  list: T[];
  meta: PaginationMeta;
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginated<T>(list: T[], page: number, limit: number, totalCount: number): Paginated<T> {
  const pageCount = Math.ceil(totalCount / limit);
  return {
    list,
    meta: {
      take: limit,
      page,
      pageCount,
      itemCount: list.length,
      totalCount,
      hasPreviousPage: page > 1,
      hasNextPage: page < pageCount,
    },
  };
}

export type ArtistSearchPagination = {
  total_count: number;
  offset: number;
  next_offset: number | null;
  has_more: boolean;
};

export function paginateArtistResults<T>(rows: T[], offset: number, limit: number, paged: boolean) {
  // Installed mobile clients reveal additional downloaded rows locally. Until
  // they opt into server paging, return the complete artist result to them.
  const start = paged ? offset : 0;
  const page = paged ? rows.slice(start, start + limit) : rows;
  const next = start + page.length;
  const hasMore = next < rows.length;
  return {
    rows: page,
    pagination: {
      total_count: rows.length,
      offset: start,
      next_offset: hasMore ? next : null,
      has_more: hasMore,
    } satisfies ArtistSearchPagination,
  };
}

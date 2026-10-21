/** Add a PostgREST OR filter that searches multiple text columns. */
export function addTextSearch(
  params: Record<string, string>,
  query: string | undefined,
  fields: string[],
) {
  const term = query?.trim().replace(/[(),]/g, " ").replace(/[%_*]/g, "").replace(/\s+/g, " ");
  if (!term) return;
  const pattern = `*${term}*`;
  params.or = `(${fields.map((field) => `${field}.ilike.${pattern}`).join(",")})`;
}

export function makePageMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

export interface LikeRecord {
  ID_Like?: string | number;
  ID_NguoiDung?: string | number;
  [key: string]: unknown;
}

export function extractLikeRecords(payload: unknown): LikeRecord[] {
  if (Array.isArray(payload)) {
    return payload as LikeRecord[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as {
    data?: unknown;
    likes?: unknown;
    rows?: unknown;
    results?: unknown;
  };

  if (Array.isArray(candidate.data)) {
    return candidate.data as LikeRecord[];
  }

  if (Array.isArray(candidate.likes)) {
    return candidate.likes as LikeRecord[];
  }

  if (Array.isArray(candidate.rows)) {
    return candidate.rows as LikeRecord[];
  }

  if (Array.isArray(candidate.results)) {
    return candidate.results as LikeRecord[];
  }

  return [];
}

export function findUserLike(
  payload: unknown,
  userId: string | number | null | undefined,
): LikeRecord | undefined {
  if (userId === null || userId === undefined || userId === '') {
    return undefined;
  }

  return extractLikeRecords(payload).find(
    (like) => String(like?.ID_NguoiDung) === String(userId),
  );
}

export function getLikeCount(payload: unknown): number {
  if (payload && typeof payload === 'object' && typeof (payload as { total?: unknown }).total === 'number') {
    return (payload as { total: number }).total;
  }

  return extractLikeRecords(payload).length;
}

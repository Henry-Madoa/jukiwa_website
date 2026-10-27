import type { Neighbours } from './types.ts';

/**
 * Where a record sits in an ordered list, and the records either side of it — what Previous and
 * Next on a card step to. The list must be in exactly the order its list screen shows.
 */
export function locate(rows: { id: number; name: string }[], id: number): Neighbours {
  const at = rows.findIndex((row) => row.id === id);
  return { previous: rows[at - 1] ?? null, next: rows[at + 1] ?? null, position: at + 1, total: rows.length };
}

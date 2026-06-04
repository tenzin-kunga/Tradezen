import { and, lt, gt, eq, SQL, sql } from 'drizzle-orm';

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: CursorMeta;
}

export class CursorPagination {
  static encodeCursor(id: string, sortValue: string | number | Date): string {
    return Buffer.from(
      JSON.stringify({
        id,
        sortValue:
          sortValue instanceof Date ? sortValue.toISOString() : sortValue,
      }),
    ).toString('base64');
  }

  static decodeCursor(cursor: string): { id: string; sortValue: string } {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      throw new Error('Invalid cursor');
    }
  }

  static buildCursorCondition(
    sortField: SQL,
    sortOrder: 'asc' | 'desc',
    cursorSortValue: string,
    cursorId: string,
  ): SQL | undefined {
    if (sortOrder === 'desc') {
      return or(
        lt(sortField, cursorSortValue),
        and(
          eq(sortField, cursorSortValue),
          lt(sql`${sql.identifier('id')}`, cursorId),
        ),
      );
    }
    return or(
      gt(sortField, cursorSortValue),
      and(
        eq(sortField, cursorSortValue),
        gt(sql`${sql.identifier('id')}`, cursorId),
      ),
    );
  }
}

function or(...conditions: (SQL | undefined)[]): SQL | undefined {
  const defined = conditions.filter((c): c is SQL => c !== undefined);
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];
  return sql`(${sql.join(defined, sql` OR `)})`;
}

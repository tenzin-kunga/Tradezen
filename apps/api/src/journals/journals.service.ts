import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '../db';
import { CreateJournalDto, UpdateJournalDto } from './dto';

@Injectable()
export class JournalsService {
  async create(userId: string, dto: CreateJournalDto) {
    const { rows } = await pool.query(
      `INSERT INTO journals (user_id, date, pre_market_notes, post_market_notes, mood, market_conditions, lessons)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, date) DO UPDATE SET
         pre_market_notes = COALESCE(EXCLUDED.pre_market_notes, journals.pre_market_notes),
         post_market_notes = COALESCE(EXCLUDED.post_market_notes, journals.post_market_notes),
         mood = COALESCE(EXCLUDED.mood, journals.mood),
         market_conditions = COALESCE(EXCLUDED.market_conditions, journals.market_conditions),
         lessons = COALESCE(EXCLUDED.lessons, journals.lessons),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        dto.date,
        dto.pre_market_notes,
        dto.post_market_notes,
        dto.mood,
        dto.market_conditions,
        dto.lessons,
      ],
    );
    return rows[0];
  }

  async findAll(userId: string, limit = 30, offset = 0) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const { rows } = await pool.query(
      `SELECT * FROM journals WHERE user_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3`,
      [userId, safeLimit, safeOffset],
    );
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM journals WHERE user_id = $1`,
      [userId],
    );
    return { data: rows, total: Number(countResult.rows[0].count) };
  }

  async findByDate(userId: string, date: string) {
    const { rows } = await pool.query(
      `SELECT * FROM journals WHERE user_id = $1 AND date = $2`,
      [userId, date],
    );
    return rows[0] || null;
  }

  async findOne(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM journals WHERE id = $1 AND user_id = $2`,
      [userId, id],
    );
    if (!rows[0]) throw new NotFoundException('Journal entry not found');
    return rows[0];
  }

  async update(userId: string, id: string, dto: UpdateJournalDto) {
    await this.findOne(userId, id);
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 3;
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }
    if (!fields.length) return this.findOne(userId, id);
    fields.push('updated_at = NOW()');
    const { rows } = await pool.query(
      `UPDATE journals SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    return rows[0];
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await pool.query(`DELETE FROM journals WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return { deleted: true };
  }

  async getStreak(userId: string) {
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM journals WHERE user_id = $1`,
      [userId],
    );
    const totalEntries = totalRows[0]?.c ?? 0;
    if (totalEntries === 0) {
      return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };
    }

    const { rows: longRows } = await pool.query(
      `WITH distinct_days AS (
         SELECT date::date AS d FROM journals WHERE user_id = $1 GROUP BY 1
       ),
       sequenced AS (
         SELECT d, (d - (ROW_NUMBER() OVER (ORDER BY d))::integer)::date AS grp
         FROM distinct_days
       ),
       runs AS (
         SELECT grp, COUNT(*)::int AS len FROM sequenced GROUP BY grp
       )
       SELECT COALESCE(MAX(len), 0)::int AS longest FROM runs`,
      [userId],
    );
    const longestStreak = longRows[0]?.longest ?? 0;

    const { rows: curRows } = await pool.query(
      `WITH distinct_days AS (
         SELECT date::date AS d FROM journals WHERE user_id = $1 GROUP BY 1
       ),
       maxd AS (SELECT MAX(d) AS last FROM distinct_days),
       seq AS (
         SELECT d, (d - (ROW_NUMBER() OVER (ORDER BY d))::integer)::date AS grp
         FROM distinct_days
       ),
      last_grp AS (
        SELECT s.grp FROM seq s JOIN maxd m ON s.d = m.last
      ),
      run_lengths AS (
        SELECT grp, COUNT(*)::int AS len FROM seq GROUP BY grp
      )
      SELECT
        CASE
          WHEN (SELECT (CURRENT_DATE - last) FROM maxd) > 1 THEN 0
          ELSE COALESCE((SELECT len FROM run_lengths WHERE grp = (SELECT grp FROM last_grp)), 0)
        END::int AS current_streak`,
      [userId],
    );
    const currentStreak = curRows[0]?.current_streak ?? 0;

    return { currentStreak, longestStreak, totalEntries };
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { pool } from "../db";
import { CreateJournalDto, UpdateJournalDto } from "./dto";

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
      [userId, dto.date, dto.pre_market_notes, dto.post_market_notes, dto.mood, dto.market_conditions, dto.lessons],
    );
    return rows[0];
  }

  async findAll(userId: string, limit = 30, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM journals WHERE user_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    const countResult = await pool.query(`SELECT COUNT(*) FROM journals WHERE user_id = $1`, [userId]);
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
    if (!rows[0]) throw new NotFoundException("Journal entry not found");
    return rows[0];
  }

  async update(userId: string, id: string, dto: UpdateJournalDto) {
    await this.findOne(userId, id);
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 3;
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    }
    if (!fields.length) return this.findOne(userId, id);
    fields.push("updated_at = NOW()");
    const { rows } = await pool.query(
      `UPDATE journals SET ${fields.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    return rows[0];
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await pool.query(`DELETE FROM journals WHERE id = $1 AND user_id = $2`, [id, userId]);
    return { deleted: true };
  }

  async getStreak(userId: string) {
    const { rows } = await pool.query(
      `SELECT date FROM journals WHERE user_id = $1 ORDER BY date DESC`,
      [userId],
    );
    if (!rows.length) return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };

    let currentStreak = 1;
    let longestStreak = 1;
    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDate = new Date(rows[0].date);
    firstDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / 86400000);
    if (diffDays > 1) currentStreak = 0;

    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
        if (i <= currentStreak || currentStreak === i) currentStreak = streak;
      } else {
        streak = 1;
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    return { currentStreak: diffDays <= 1 ? currentStreak : 0, longestStreak, totalEntries: rows.length };
  }
}

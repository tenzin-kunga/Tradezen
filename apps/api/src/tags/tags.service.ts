import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { pool } from "../db";
import { CreateTagDto, UpdateTagDto } from "./dto";

@Injectable()
export class TagsService {
  async create(userId: string, dto: CreateTagDto) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO tags (user_id, name, color, category) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, dto.name.trim(), dto.color || "#888888", dto.category || "setup"],
      );
      return rows[0];
    } catch (err: any) {
      if (err.code === "23505") throw new ConflictException("Tag with this name already exists");
      throw err;
    }
  }

  async findAll(userId: string) {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(tt.trade_id)::int AS trade_count
       FROM tags t LEFT JOIN trade_tags tt ON t.id = tt.tag_id
       WHERE t.user_id = $1 GROUP BY t.id ORDER BY t.name`,
      [userId],
    );
    return rows;
  }

  async findOne(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM tags WHERE id = $1 AND user_id = $2`,
      [userId, id],
    );
    if (!rows[0]) throw new NotFoundException("Tag not found");
    return rows[0];
  }

  async update(userId: string, id: string, dto: UpdateTagDto) {
    await this.findOne(userId, id);
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 3;
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(key === "name" ? (val as string).trim() : val);
        idx++;
      }
    }
    if (!fields.length) return this.findOne(userId, id);
    const { rows } = await pool.query(
      `UPDATE tags SET ${fields.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    return rows[0];
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await pool.query(`DELETE FROM tags WHERE id = $1 AND user_id = $2`, [id, userId]);
    return { deleted: true };
  }

  async addTagToTrade(userId: string, tradeId: string, tagId: string) {
    // verify ownership
    const tradeCheck = await pool.query(`SELECT id FROM trades WHERE id = $1 AND user_id = $2`, [tradeId, userId]);
    if (!tradeCheck.rows[0]) throw new NotFoundException("Trade not found");
    await this.findOne(userId, tagId);
    try {
      await pool.query(`INSERT INTO trade_tags (trade_id, tag_id) VALUES ($1, $2)`, [tradeId, tagId]);
    } catch (err: any) {
      if (err.code === "23505") return; // already tagged
      throw err;
    }
    return { tagged: true };
  }

  async removeTagFromTrade(userId: string, tradeId: string, tagId: string) {
    await pool.query(`DELETE FROM trade_tags WHERE trade_id = $1 AND tag_id = $2`, [tradeId, tagId]);
    return { untagged: true };
  }

  async getTradesForTag(userId: string, tagId: string) {
    const { rows } = await pool.query(
      `SELECT tr.* FROM trades tr
       JOIN trade_tags tt ON tr.id = tt.trade_id
       WHERE tt.tag_id = $1 AND tr.user_id = $2
       ORDER BY tr.created_at DESC`,
      [tagId, userId],
    );
    return rows;
  }

  async getTagsForTrade(userId: string, tradeId: string) {
    const { rows } = await pool.query(
      `SELECT t.* FROM tags t
       JOIN trade_tags tt ON t.id = tt.tag_id
       WHERE tt.trade_id = $1 AND t.user_id = $2
       ORDER BY t.name`,
      [tradeId, userId],
    );
    return rows;
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { pool } from '../db';
import { CreateTagDto, UpdateTagDto } from './dto';
import { TagCategory } from './dto/create-tag.dto';
import { withTransaction } from '../common/utils/transaction';

@Injectable()
export class TagsService {
  async create(userId: string, dto: CreateTagDto) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO tags (user_id, name, color, category) VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          userId,
          dto.name.trim(),
          dto.color || '#888888',
          dto.category || TagCategory.SETUP,
        ],
      );
      return rows[0];
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === '23505'
      )
        throw new ConflictException('Tag with this name already exists');
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
    if (!rows[0]) throw new NotFoundException('Tag not found');
    return rows[0];
  }

  async update(userId: string, id: string, dto: UpdateTagDto) {
    const fields: string[] = [];
    const values: (string | number | undefined)[] = [];
    let idx = 3;
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(key === 'name' ? (val as string).trim() : val);
        idx++;
      }
    }
    if (!fields.length) {
      const { rows } = await pool.query(
        'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
      if (!rows[0]) throw new NotFoundException('Tag not found');
      return rows[0];
    }
    const result = await pool.query(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values],
    );
    if (result.rowCount === 0) throw new NotFoundException('Tag not found');
    return result.rows[0];
  }

  async remove(userId: string, id: string) {
    return withTransaction(async (client) => {
      const checkRes = await client.query(
        'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
      if (checkRes.rowCount === 0) throw new NotFoundException('Tag not found');

      await client.query(`DELETE FROM tags WHERE id = $1 AND user_id = $2`, [
        id,
        userId,
      ]);
      return { deleted: true };
    });
  }

  async addTagToTrade(userId: string, tradeId: string, tagId: string) {
    return withTransaction(async (client) => {
      const tradeCheck = await client.query(
        `SELECT id FROM trades WHERE id = $1 AND user_id = $2`,
        [tradeId, userId],
      );
      if (!tradeCheck.rows[0]) throw new NotFoundException('Trade not found');

      const tagCheck = await client.query(
        `SELECT * FROM tags WHERE id = $1 AND user_id = $2`,
        [tagId, userId],
      );
      if (!tagCheck.rows[0]) throw new NotFoundException('Tag not found');

      try {
        await client.query(
          `INSERT INTO trade_tags (trade_id, tag_id) VALUES ($1, $2)`,
          [tradeId, tagId],
        );
      } catch (err) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === '23505'
        )
          return { tagged: true };
        throw err;
      }
      return { tagged: true };
    });
  }

  async removeTagFromTrade(userId: string, tradeId: string, tagId: string) {
    await pool.query(
      `DELETE FROM trade_tags WHERE trade_id = $1 AND tag_id = $2`,
      [tradeId, tagId],
    );
    return { untagged: true };
  }

  async getTradesForTag(
    userId: string,
    tagId: string,
    limit: number,
    offset: number,
  ) {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM trades tr
       JOIN trade_tags tt ON tr.id = tt.trade_id
       WHERE tt.tag_id = $1 AND tr.user_id = $2`,
      [tagId, userId],
    );
    const total = countRows[0]?.c ?? 0;

    const { rows } = await pool.query(
      `SELECT tr.* FROM trades tr
       JOIN trade_tags tt ON tr.id = tt.trade_id
       WHERE tt.tag_id = $1 AND tr.user_id = $2
       ORDER BY tr.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tagId, userId, safeLimit, safeOffset],
    );

    return {
      data: rows,
      total,
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
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

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { tags, tradeTags, trades } from '@tradezen/db';
import { CreateTagDto, UpdateTagDto } from './dto';
import { TagCategory } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  async create(userId: string, dto: CreateTagDto) {
    try {
      const result = await db
        .insert(tags)
        .values({
          userId,
          name: dto.name.trim(),
          color: dto.color || '#888888',
          category: dto.category || TagCategory.SETUP,
        })
        .returning();
      return result[0];
    } catch (err: unknown) {
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
    const result = await db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        color: tags.color,
        category: tags.category,
        createdAt: tags.createdAt,
        tradeCount: count(tradeTags.tradeId),
      })
      .from(tags)
      .leftJoin(tradeTags, eq(tags.id, tradeTags.tagId))
      .where(eq(tags.userId, userId))
      .groupBy(tags.id)
      .orderBy(tags.name);
    return result;
  }

  async findOne(userId: string, id: string) {
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));
    if (!result[0]) throw new NotFoundException('Tag not found');
    return result[0];
  }

  async update(userId: string, id: string, dto: UpdateTagDto) {
    const updateData: Partial<typeof tags.$inferInsert> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.category !== undefined) updateData.category = dto.category;

    if (Object.keys(updateData).length === 0) {
      const result = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, id), eq(tags.userId, userId)));
      if (!result[0]) throw new NotFoundException('Tag not found');
      return result[0];
    }

    const result = await db
      .update(tags)
      .set(updateData)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Tag not found');
    return result[0];
  }

  async remove(userId: string, id: string) {
    const result = await db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Tag not found');
    return { deleted: true };
  }

  async addTagToTrade(userId: string, tradeId: string, tagId: string) {
    const tradeCheck = await db
      .select({ id: trades.id })
      .from(trades)
      .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));
    if (!tradeCheck[0]) throw new NotFoundException('Trade not found');

    const tagCheck = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
    if (!tagCheck[0]) throw new NotFoundException('Tag not found');

    try {
      await db.insert(tradeTags).values({ tradeId, tagId });
    } catch (err: unknown) {
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
  }

  async removeTagFromTrade(userId: string, tradeId: string, tagId: string) {
    await db
      .delete(tradeTags)
      .where(and(eq(tradeTags.tradeId, tradeId), eq(tradeTags.tagId, tagId)));
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

    const countResult = await db
      .select({ count: count() })
      .from(trades)
      .innerJoin(tradeTags, eq(trades.id, tradeTags.tradeId))
      .where(and(eq(tradeTags.tagId, tagId), eq(trades.userId, userId)));
    const total = countResult[0]?.count ?? 0;

    const result = await db
      .select()
      .from(trades)
      .innerJoin(tradeTags, eq(trades.id, tradeTags.tradeId))
      .where(and(eq(tradeTags.tagId, tagId), eq(trades.userId, userId)))
      .orderBy(desc(trades.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);

    return {
      data: result.map((r) => r.trades),
      total,
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async getTagsForTrade(userId: string, tradeId: string) {
    const result = await db
      .select()
      .from(tags)
      .innerJoin(tradeTags, eq(tags.id, tradeTags.tagId))
      .where(and(eq(tradeTags.tradeId, tradeId), eq(tags.userId, userId)))
      .orderBy(tags.name);
    return result.map((r) => r.tags);
  }
}

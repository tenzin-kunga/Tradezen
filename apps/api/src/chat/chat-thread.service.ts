import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db/drizzle';
import { chatThreads, chatMessages } from '@tradezen/db';
import { eq, and, desc, asc, ilike, or, sql } from 'drizzle-orm';

@Injectable()
export class ChatThreadService {
  async createThread(userId: string, title?: string): Promise<{ id: string }> {
    const [thread] = await db
      .insert(chatThreads)
      .values({ userId, title: title || 'New Conversation' })
      .returning({ id: chatThreads.id });
    return thread;
  }

  async listThreads(
    userId: string,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      title: string | null;
      summary: string | null;
      primaryType: string | null;
      tags: string[] | null;
      pinned: boolean | null;
      updatedAt: Date | null;
    }>
  > {
    return db
      .select({
        id: chatThreads.id,
        title: chatThreads.title,
        summary: chatThreads.summary,
        primaryType: chatThreads.primaryType,
        tags: chatThreads.tags,
        pinned: chatThreads.pinned,
        updatedAt: chatThreads.updatedAt,
      })
      .from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.pinned), desc(chatThreads.updatedAt))
      .limit(limit);
  }

  async searchThreads(
    userId: string,
    query: string,
  ): Promise<
    Array<{
      id: string;
      title: string | null;
      summary: string | null;
      primaryType: string | null;
      tags: string[] | null;
      pinned: boolean | null;
      updatedAt: Date | null;
    }>
  > {
    const lower = `%${query.toLowerCase()}%`;
    return db
      .select({
        id: chatThreads.id,
        title: chatThreads.title,
        summary: chatThreads.summary,
        primaryType: chatThreads.primaryType,
        tags: chatThreads.tags,
        pinned: chatThreads.pinned,
        updatedAt: chatThreads.updatedAt,
      })
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.userId, userId),
          or(
            ilike(chatThreads.title, lower),
            ilike(chatThreads.summary, lower),
            sql` EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(${chatThreads.tags}) AS tag
              WHERE lower(tag) LIKE ${lower}
            )`,
          ),
        ),
      )
      .orderBy(desc(chatThreads.pinned), desc(chatThreads.updatedAt))
      .limit(20);
  }

  async getThread(
    userId: string,
    threadId: string,
  ): Promise<{
    id: string;
    title: string | null;
    summary: string | null;
    primaryType: string | null;
    tags: string[] | null;
    pinned: boolean | null;
  } | null> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    return thread
      ? {
          id: thread.id,
          title: thread.title,
          summary: thread.summary,
          primaryType: thread.primaryType,
          tags: thread.tags,
          pinned: thread.pinned,
        }
      : null;
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    await db.delete(chatThreads).where(eq(chatThreads.id, threadId));
  }

  async updateThreadTitle(
    userId: string,
    threadId: string,
    title: string,
  ): Promise<void> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    await db
      .update(chatThreads)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  }

  async updateThreadSummary(threadId: string, summary: string): Promise<void> {
    await db
      .update(chatThreads)
      .set({ summary, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  }

  async updateThreadType(
    userId: string,
    threadId: string,
    primaryType: string,
    tags: string[],
  ): Promise<void> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    await db
      .update(chatThreads)
      .set({ primaryType, tags, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  }

  async togglePin(
    userId: string,
    threadId: string,
  ): Promise<{ pinned: boolean }> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    const newPinned = !thread.pinned;
    await db
      .update(chatThreads)
      .set({ pinned: newPinned, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
    return { pinned: newPinned };
  }

  async getMessages(
    threadId: string,
    userId: string,
    limit = 50,
  ): Promise<
    Array<{
      role: string;
      content: string;
      metadata: unknown;
      createdAt: Date | null;
    }>
  > {
    // First verify the thread belongs to the user
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });

    if (!thread) {
      throw new NotFoundException('Thread not found or access denied');
    }

    return db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
        metadata: chatMessages.metadata,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit);
  }

  async addMessage(
    threadId: string,
    role: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(chatMessages).values({ threadId, role, content, metadata });
    await db
      .update(chatThreads)
      .set({ updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  }
}

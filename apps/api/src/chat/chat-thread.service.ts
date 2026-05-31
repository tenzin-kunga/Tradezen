import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db/drizzle';
import { chatThreads, chatMessages } from '@tradezen/db';
import { eq, and, desc, asc } from 'drizzle-orm';

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
    limit = 20,
  ): Promise<
    Array<{ id: string; title: string | null; updatedAt: Date | null }>
  > {
    return db
      .select({
        id: chatThreads.id,
        title: chatThreads.title,
        updatedAt: chatThreads.updatedAt,
      })
      .from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.updatedAt))
      .limit(limit);
  }

  async getThread(
    userId: string,
    threadId: string,
  ): Promise<{ id: string; title: string | null } | null> {
    const thread = await db.query.chatThreads.findFirst({
      where: and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)),
    });
    return thread ? { id: thread.id, title: thread.title } : null;
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

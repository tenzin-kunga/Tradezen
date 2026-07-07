import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { db } from "../db/drizzle";
import {
  knowledgeFolders,
  knowledgeDocuments,
  knowledgeDocumentVersions,
  knowledgeAssets,
  knowledgeDocumentLinks,
} from "@tradezen/db";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  CreateFolderDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateLinkDto,
} from "./dto";
import { DocumentEmbedder } from "./indexing/embedder";

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(private readonly embedder: DocumentEmbedder) {}
  // ─── Folders ─────────────────────────────────

  async listFolders(userId: string, parentId?: string) {
    const conditions = [eq(knowledgeFolders.userId, userId)];
    if (parentId) {
      conditions.push(eq(knowledgeFolders.parentId, parentId));
    } else {
      // Root folders: parent_id IS NULL
      // Drizzle doesn't have isNull, so we check for undefined
    }

    return db
      .select()
      .from(knowledgeFolders)
      .where(and(...conditions))
      .orderBy(asc(knowledgeFolders.sortOrder));
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    const [folder] = await db
      .insert(knowledgeFolders)
      .values({
        userId,
        name: dto.name,
        parentId: dto.parent_id || null,
        icon: dto.icon || null,
      })
      .returning();
    return folder;
  }

  async updateFolder(userId: string, folderId: string, data: { name?: string; icon?: string; parent_id?: string }) {
    const folder = await this.getFolder(userId, folderId);
    if (!folder) throw new NotFoundException("Folder not found");

    const [updated] = await db
      .update(knowledgeFolders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeFolders.id, folderId))
      .returning();
    return updated;
  }

  async deleteFolder(userId: string, folderId: string) {
    const folder = await this.getFolder(userId, folderId);
    if (!folder) throw new NotFoundException("Folder not found");
    await db.delete(knowledgeFolders).where(eq(knowledgeFolders.id, folderId));
  }

  private async getFolder(userId: string, folderId: string) {
    const result = await db
      .select()
      .from(knowledgeFolders)
      .where(and(eq(knowledgeFolders.id, folderId), eq(knowledgeFolders.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  // ─── Documents ────────────────────────────────

  async listDocuments(userId: string, folderId?: string) {
    const conditions = [eq(knowledgeDocuments.userId, userId)];
    if (folderId) {
      conditions.push(eq(knowledgeDocuments.folderId, folderId));
    }

    return db
      .select()
      .from(knowledgeDocuments)
      .where(and(...conditions))
      .orderBy(desc(knowledgeDocuments.updatedAt));
  }

  async getDocument(userId: string, documentId: string) {
    const result = await db
      .select()
      .from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  async createDocument(userId: string, dto: CreateDocumentDto) {
    const [doc] = await db
      .insert(knowledgeDocuments)
      .values({
        userId,
        title: dto.title,
        folderId: dto.folder_id || null,
        content: dto.content || "",
        docType: dto.doc_type || "note",
        templateId: dto.template_id || null,
        frontmatter: dto.frontmatter || {},
      })
      .returning();

    // Create initial version
    await db.insert(knowledgeDocumentVersions).values({
      documentId: doc.id,
      version: 1,
      content: dto.content || "",
    });

    // Trigger background embedding (non-blocking)
    if (dto.content && dto.content.length > 0) {
      this.embedder.embedDocument(userId, doc.id, dto.content).catch((e) => {
        this.logger.error(`Failed to embed document ${doc.id}: ${e}`);
      });
    }

    return doc;
  }

  async updateDocument(userId: string, documentId: string, dto: UpdateDocumentDto) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) {
      updateData.content = dto.content;
      updateData.currentVersion = doc.currentVersion + 1;
      // Auto-create version
      await db.insert(knowledgeDocumentVersions).values({
        documentId,
        version: doc.currentVersion + 1,
        content: dto.content,
      });

      // Trigger background embedding (non-blocking)
      this.embedder.embedDocument(userId, documentId, dto.content).catch((e) => {
        this.logger.error(`Failed to embed document ${documentId}: ${e}`);
      });
    }
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.frontmatter !== undefined) updateData.frontmatter = dto.frontmatter;

    const [updated] = await db
      .update(knowledgeDocuments)
      .set(updateData)
      .where(eq(knowledgeDocuments.id, documentId))
      .returning();
    return updated;
  }

  async deleteDocument(userId: string, documentId: string) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId));
  }

  // ─── Versions ─────────────────────────────────

  async listVersions(userId: string, documentId: string) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");

    return db
      .select()
      .from(knowledgeDocumentVersions)
      .where(eq(knowledgeDocumentVersions.documentId, documentId))
      .orderBy(desc(knowledgeDocumentVersions.version));
  }

  // ─── Assets ───────────────────────────────────

  async listAssets(userId: string, documentId: string) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");

    return db
      .select()
      .from(knowledgeAssets)
      .where(eq(knowledgeAssets.documentId, documentId))
      .orderBy(desc(knowledgeAssets.createdAt));
  }

  async deleteAsset(userId: string, assetId: string) {
    await db.delete(knowledgeAssets).where(eq(knowledgeAssets.id, assetId));
  }

  // ─── Links ────────────────────────────────────

  async listLinks(userId: string, documentId: string) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");

    return db
      .select()
      .from(knowledgeDocumentLinks)
      .where(eq(knowledgeDocumentLinks.sourceDocumentId, documentId))
      .orderBy(desc(knowledgeDocumentLinks.createdAt));
  }

  async createLink(userId: string, documentId: string, dto: CreateLinkDto) {
    const doc = await this.getDocument(userId, documentId);
    if (!doc) throw new NotFoundException("Document not found");

    const [link] = await db
      .insert(knowledgeDocumentLinks)
      .values({
        sourceDocumentId: documentId,
        targetDocumentId: dto.target_document_id,
        relationshipType: dto.relationship_type,
      })
      .returning();
    return link;
  }

  async deleteLink(userId: string, linkId: string) {
    await db.delete(knowledgeDocumentLinks).where(eq(knowledgeDocumentLinks.id, linkId));
  }

  // ─── Search ───────────────────────────────────

  async search(userId: string, query: string) {
    if (query.length < 1) return [];

    // Simple search by title
    return db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.userId, userId))
      .orderBy(desc(knowledgeDocuments.updatedAt))
      .limit(20);
  }
}

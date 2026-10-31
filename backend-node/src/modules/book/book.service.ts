import { randomUUID } from 'node:crypto';
import { AppError, ConflictError } from '../../core/errors/AppError';
import type { BookDocumentCreate } from './contract';
import { BookRepository, type BookScope, type BookTransaction } from './book.repository';
import { readPlanning, readBookConfig, record, editablePlanning, type BookDocumentUpdate, type BookConfigUpdate, type BookPlanning, type BookBatch } from './contract';

export class BookService {
  constructor(private readonly repository = new BookRepository()) {}

  async create(scope: BookScope, input: BookDocumentCreate) {
    return this.repository.transaction(async tx => {
      const root = await this.repository.folder(tx, scope, input.rootFolderId);
      await this.repository.withinRoot(tx, scope, input.folderId, root.id);
      const folder = await this.repository.folder(tx, scope, input.folderId);
      const config = readBookConfig(root.metadata);
      if (!config) throw new AppError('Unsupported Book configuration', 409, 'UNSUPPORTED_BOOK_VERSION');
      const plan = input.planning.plan;
      if (plan.kind === 'sprint' && !await this.repository.hasSprint(tx, scope, folder.id, root.id, plan.sprintId)) throw new AppError('Choose a sprint belonging to this folder or one of its parents', 400, 'INVALID_SPRINT');
      const schema = record(record(folder.metadata).schema);
      for (const [key, field] of Object.entries(schema)) {
        const rule = record(field);
        if ((rule.required && key !== 'airunoteBook') || (key === 'airunoteBook' && rule.type !== 'object')) throw new AppError('Use the document editor to provide this folder’s custom attributes before planning the item.', 400, 'FOLDER_ATTRIBUTES_REQUIRED');
      }
      const quota = await this.repository.quota(tx, scope);
      const configuredLimit = Number(process.env.FREE_PLAN_LIMIT ?? 10); const limit = Number.isFinite(configuredLimit) ? configuredLimit : 10;
      if (quota.plan !== 'pro' && quota.count >= limit) throw new AppError('Upgrade required to continue', 403, 'UPGRADE_REQUIRED');
      const planning: BookPlanning = { ...input.planning, version: 1, history: [{ id: randomUUID(), at: new Date().toISOString(), actorId: scope.userId, action: 'Captured in Book' }] };
      const document = await this.repository.create(tx, scope, folder.id, input.name, input.content, { airunoteBook: planning });
      return { ...document, content: document.canonicalContent };
    });
  }

  async update(scope: BookScope, id: string, update: BookDocumentUpdate) {
    return this.repository.transaction(tx => this.updateInTransaction(tx, scope, id, update));
  }

  private async updateInTransaction(tx: BookTransaction, scope: BookScope, id: string, update: BookDocumentUpdate) {
      const root = await this.repository.folder(tx, scope, update.rootFolderId);
      const current = await this.repository.document(tx, scope, id);
      await this.repository.withinRoot(tx, scope, current.folderId, root.id);
      if (current.updatedAt.toISOString() !== update.expectedUpdatedAt) throw new ConflictError('This item changed elsewhere. Reload it before saving your draft.');
      if (current.state !== 'active') throw new AppError('Restore this document before planning it', 409, 'DOCUMENT_INACTIVE');
      const previous = readPlanning(current.attributes);
      if (!previous) throw new AppError('This item has an unsupported planning format. Its saved data was preserved.', 409, 'UNSUPPORTED_BOOK_VERSION');
      const config = readBookConfig(root.metadata);
      if (!config) throw new AppError('Unsupported Book configuration', 409, 'UNSUPPORTED_BOOK_VERSION');
      if (update.folderId) await this.repository.withinRoot(tx, scope, update.folderId, root.id);
      if (update.contentType && current.type !== update.contentType) throw new AppError('The note format changed. Reload before saving.', 409, 'DOCUMENT_FORMAT_CHANGED');
      if (update.content !== undefined && current.type === 'RTF' && update.contentType !== 'RTF') throw new AppError('Use the document editor to edit rich text', 400, 'RICH_TEXT_EDITOR_REQUIRED');
      if (update.planning?.plan.kind === 'sprint') {
        const sprintId = update.planning.plan.sprintId;
        if (!await this.repository.hasSprint(tx, scope, update.folderId ?? current.folderId, root.id, sprintId)) throw new AppError('Choose a sprint belonging to this folder or one of its parents', 400, 'INVALID_SPRINT');
      }
      const action = [update.name !== undefined && update.name !== current.name ? 'Renamed' : '', update.content !== undefined && update.content !== current.canonicalContent ? 'Updated brief' : '', update.folderId && update.folderId !== current.folderId ? 'Moved folder' : '', update.planning ? 'Updated planning' : ''].filter(Boolean).join('; ');
      if (!action) return { ...current, content: current.canonicalContent };
      const planning: BookPlanning = { ...previous, ...update.planning, history: [...previous.history, { id: randomUUID(), at: new Date().toISOString(), actorId: scope.userId, action }] };
      const document = await this.repository.saveDocument(tx, id, {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.content !== undefined ? { canonicalContent: update.content, content: update.content } : {}),
        ...(update.folderId ? { folderId: update.folderId } : {}),
        attributes: { ...record(current.attributes), airunoteBook: planning },
      });
      if (update.content !== undefined && update.content !== current.canonicalContent) await this.repository.revision(tx, id, update.content, scope.userId);
      return { ...document, content: document.canonicalContent };
  }

  async batch(scope: BookScope, batch: BookBatch) {
    return this.repository.transaction(async tx => {
      const results: Awaited<ReturnType<typeof this.updateInTransaction>>[] = [];
      // Stable lock order prevents two batches taking the same rows in reverse order.
      for (const entry of [...batch.entries].sort((a, b) => a.id.localeCompare(b.id))) {
        const current = await this.repository.document(tx, scope, entry.id);
        const planning = readPlanning(current.attributes);
        if (!planning) throw new AppError('Unsupported planning data', 409, 'UNSUPPORTED_BOOK_VERSION');
        const fields = editablePlanning(planning); const change = batch.change;
        results.push(await this.updateInTransaction(tx, scope, entry.id, {
          rootFolderId: batch.rootFolderId, expectedUpdatedAt: entry.expectedUpdatedAt,
          ...(change.kind === 'folder' ? { folderId: change.folderId } : {}),
          planning: change.kind === 'status' ? { ...fields, status: change.status } : change.kind === 'folder' ? { ...fields, processed: true } : { ...fields, plan: change.plan },
        }));
      }
      return results;
    });
  }

  async configure(scope: BookScope, folderId: string, update: BookConfigUpdate) {
    return this.repository.transaction(async tx => {
      const folder = await this.repository.folder(tx, scope, folderId, true);
      const current = readBookConfig(folder.metadata);
      if (!current) throw new AppError('Unsupported Book configuration', 409, 'UNSUPPORTED_BOOK_VERSION');
      if (current.revision !== update.expectedRevision) throw new ConflictError('Book settings changed elsewhere. Reload before saving.');
      // Keep closed/removed sprint identities, so existing placements never dangle.
      if (current.sprints.some(sprint => !update.config.sprints.some(next => next.id === sprint.id))) throw new AppError('Close a sprint instead of deleting it', 400, 'SPRINT_IN_USE');
      return this.repository.saveConfig(tx, folder.id, { ...record(folder.metadata), airunoteBook: { ...update.config, version: 1, revision: current.revision + 1 } });
    });
  }
}

import { createHash, randomUUID } from 'node:crypto';
import { defaultKindFields, editableKindDetails, kindPlanning, kindValidation, readKindDetails, type KindDetails, type KindFields } from './kinds';
import { dailyNoteNames } from './daily';
import { AppError, ConflictError } from '../../core/errors/AppError';
import type { BookDocumentCreate } from './contract';
import { BookRepository, type BookScope, type BookTransaction } from './book.repository';
import { readPlanning, readBookConfig, record, editablePlanning, defaultPlanning, daySchema, type BookDocumentUpdate, type BookConfigUpdate, type BookPlanning, type BookBatch } from './contract';

export class BookService {
  constructor(private readonly repository = new BookRepository()) {}

  async create(scope: BookScope, input: BookDocumentCreate) {
    return this.repository.transaction(tx => this.createInTransaction(tx, scope, input));
  }

  async copy(scope: BookScope, id: string, target: { rootFolderId: string; folderId: string; expectedUpdatedAt: string }) {
    return this.repository.transaction(async tx => {
      const source = await this.repository.document(tx, scope, id);
      await this.repository.withinRoot(tx, scope, source.folderId, target.rootFolderId, true);
      await this.repository.withinRoot(tx, scope, target.folderId, target.rootFolderId, true);
      if (source.state !== 'active') throw new AppError('Restore this item before copying it.', 409, 'DOCUMENT_INACTIVE');
      if (source.updatedAt.toISOString() !== target.expectedUpdatedAt) throw new ConflictError('The original changed. Copy it again to use its latest version.');
      const planning = readPlanning(source.attributes);
      const details = readKindDetails(source.attributes);
      if (!planning || details === null) throw new AppError('This item has unsupported details.', 409, 'UNSUPPORTED_BOOK_VERSION');
      const fields = editablePlanning(planning);
      fields.processed = target.folderId !== target.rootFolderId;
      if (fields.plan.kind === 'sprint' && !await this.repository.hasSprint(tx, scope, target.folderId, target.rootFolderId, fields.plan.sprintId)) {
        fields.plan = { kind: 'unplanned' };
      }
      const kindFields = details ? { ...editableKindDetails(details), reminderAt: null } : undefined;
      return this.createInTransaction(tx, scope, {
        ...target,
        name: source.name,
        content: source.canonicalContent,
        planning: fields,
        kindFields,
      }, source.type, true);
    });
  }

  private async createInTransaction(tx: BookTransaction, scope: BookScope, input: BookDocumentCreate, type: 'MD' | 'TXT' | 'RTF' = 'MD', copy = false) {
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
    const details = input.kindFields ? await this.prepareKind(tx, scope, root.id, input.planning, input.kindFields) : undefined;
    const planning: BookPlanning = { ...(input.kindFields ? kindPlanning(input.planning, input.kindFields) : input.planning), version: 1, history: [{ id: randomUUID(), at: new Date().toISOString(), actorId: scope.userId, action: 'Captured in Book' }] };
    const document = await this.repository.create(tx, scope, folder.id, input.name, input.content, { airunoteBook: planning, ...(details ? { airunoteKinds: details } : {}) }, type, copy);
    return { ...document, content: document.canonicalContent };
  }

  async daily(scope: BookScope, rootFolderId: string, value: string) {
    const date = daySchema.parse(value);
    return this.repository.transaction(async tx => {
      const root = await this.repository.folder(tx, scope, rootFolderId);
      if (root.humanId !== '__user_root__') throw new AppError('Open daily notes from your workspace', 400, 'INVALID_DAILY_ROOT');
      // Serialize retries without blocking unrelated document creation or folder updates.
      await this.repository.lockDaily(tx, scope, date);
      const names = dailyNoteNames(date);
      const name = names[0]!;
      const candidates = await this.repository.daily(tx, scope, root.id, date, names);
      const existing = candidates[0];
      if (candidates.length > 1 && record(record(existing?.attributes).airunoteDaily).date !== date) {
        throw new AppError('More than one note uses this date. Open the one you want from Folders.', 409, 'DAILY_NOTE_AMBIGUOUS');
      }
      if (existing) {
        const savedDate = record(record(existing.attributes).airunoteDaily).date;
        if (savedDate && savedDate !== date) throw new AppError('Another daily note uses this date title. Rename that note before opening today.', 409, 'DAILY_NOTE_NAME_CONFLICT');
        if (existing.state !== 'active') throw new AppError('Restore this daily note from Archive / Trash first.', 409, 'DAILY_NOTE_INACTIVE');
        if (existing.type !== 'MD' || !readPlanning(existing.attributes)) throw new AppError('A note with this date already exists. Open it from Folders.', 409, 'DAILY_NOTE_FORMAT');
        if (record(record(existing.attributes).airunoteDaily).date === date) return { ...existing, content: existing.canonicalContent };
        const tagged = await this.repository.saveDocument(tx, existing.id, { attributes: { ...record(existing.attributes), airunoteDaily: { date } } });
        return { ...tagged, content: tagged.canonicalContent };
      }
      const planning = editablePlanning(defaultPlanning('note', true));
      planning.plan = { kind: 'day', date, time: null, duration: null };
      const created = await this.createInTransaction(tx, scope, { rootFolderId, folderId: root.id, name, content: '', planning });
      const tagged = await this.repository.saveDocument(tx, created.id, { attributes: { ...record(created.attributes), airunoteDaily: { date } } });
      return { ...tagged, content: tagged.canonicalContent };
    });
  }

  async update(scope: BookScope, id: string, update: BookDocumentUpdate) {
    return this.repository.transaction(tx => this.updateInTransaction(tx, scope, id, update));
  }

  private async prepareKind(tx: BookTransaction, scope: BookScope, rootId: string, planning: import('./contract').PlanningFields, fields: KindFields, previous?: KindDetails): Promise<KindDetails> {
    const error = kindValidation(planning, fields);
    if (error) throw new AppError(error, 400, 'INVALID_KIND_DETAILS');
    if (planning.kind === 'goal' && fields.goal?.nextTaskId) {
      const task = await this.repository.document(tx, scope, fields.goal.nextTaskId);
      await this.repository.withinRoot(tx, scope, task.folderId, rootId);
      if (task.state !== 'active' || readPlanning(task.attributes)?.kind !== 'task') throw new AppError('Choose an active task in this workspace.', 400, 'INVALID_GOAL_TASK');
    }
    const history = previous?.goalHistory ?? [];
    const goal = fields.goal;
    const changed = planning.kind === 'goal' && goal && (!previous?.goal || ['measure', 'unit', 'current', 'target'].some(key => goal[key as keyof typeof goal] !== previous.goal?.[key as keyof typeof goal]));
    if (changed && history.length >= 1000) throw new AppError('This goal has reached its progress-history limit.', 409, 'GOAL_HISTORY_LIMIT');
    return { ...fields, releases: previous?.releases ?? [], goalHistory: changed ? [...history, { at: new Date().toISOString(), measure: goal.measure, unit: goal.unit, current: goal.current, target: goal.target }] : history };
  }

  async readyDocument(scope: BookScope, id: string, rootFolderId: string, expectedUpdatedAt: string) {
    return this.repository.transaction(async tx => {
      const current = await this.repository.document(tx, scope, id);
      await this.repository.withinRoot(tx, scope, current.folderId, rootFolderId);
      if (current.updatedAt.toISOString() !== expectedUpdatedAt) throw new ConflictError('This document changed. Save or reload before marking it ready.');
      if (current.state !== 'active' || readPlanning(current.attributes)?.kind !== 'document') throw new AppError('Choose an active Document.', 400, 'INVALID_DOCUMENT_KIND');
      const details = readKindDetails(current.attributes);
      if (details === null) throw new AppError('Unsupported kind details were preserved.', 409, 'UNSUPPORTED_KIND_VERSION');
      const releases = details?.releases ?? [];
      const sha256 = createHash('sha256').update(JSON.stringify([current.name, current.type, current.canonicalContent])).digest('hex');
      if (releases.at(-1)?.sha256 === sha256) return { ...current, content: current.canonicalContent };
      if (releases.length >= 100) throw new AppError('This document has reached its ready-version limit.', 409, 'DOCUMENT_VERSION_LIMIT');
      const snapshot = await this.repository.revision(tx, id, current.canonicalContent, scope.userId);
      const release = { id: snapshot.id, number: releases.length + 1, name: current.name, type: current.type, sha256, createdAt: new Date().toISOString() };
      const document = await this.repository.saveDocument(tx, id, { attributes: { ...record(current.attributes), airunoteKinds: { ...(details ?? { ...defaultKindFields(), goalHistory: [] }), releases: [...releases, release] } } });
      return { ...document, content: document.canonicalContent };
    });
  }

  async documentVersion(scope: BookScope, id: string, rootFolderId: string, revisionId: string) {
    return this.repository.transaction(async tx => {
      const document = await this.repository.document(tx, scope, id);
      await this.repository.withinRoot(tx, scope, document.folderId, rootFolderId);
      const release = readKindDetails(document.attributes)?.releases.find(value => value.id === revisionId);
      if (!release) throw new AppError('Version not found.', 404, 'VERSION_NOT_FOUND');
      const snapshot = await this.repository.releasedContent(tx, id, release.id);
      if (!snapshot) throw new AppError('Version not found.', 404, 'VERSION_NOT_FOUND');
      return { ...release, content: snapshot.content };
    });
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
      const storedKind = readKindDetails(current.attributes);
      if (storedKind === null && update.kindFields) throw new AppError('Unsupported kind details were preserved.', 409, 'UNSUPPORTED_KIND_VERSION');
      const kindFields = update.kindFields ?? (storedKind ? editableKindDetails(storedKind) : undefined);
      const nextFields = { ...editablePlanning(previous), ...update.planning };
      const details = kindFields ? await this.prepareKind(tx, scope, root.id, nextFields, kindFields, storedKind ?? undefined) : undefined;
      const action = [update.name !== undefined && update.name !== current.name ? 'Renamed' : '', update.content !== undefined && update.content !== current.canonicalContent ? 'Updated brief' : '', update.folderId && update.folderId !== current.folderId ? 'Moved folder' : '', update.planning ? 'Updated planning' : '', update.kindFields ? 'Updated kind details' : ''].filter(Boolean).join('; ');
      if (!action) return { ...current, content: current.canonicalContent };
      const planning: BookPlanning = { ...previous, ...(kindFields ? kindPlanning(nextFields, kindFields) : nextFields), history: [...previous.history, { id: randomUUID(), at: new Date().toISOString(), actorId: scope.userId, action }] };
      const document = await this.repository.saveDocument(tx, id, {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.content !== undefined ? { canonicalContent: update.content, content: update.content } : {}),
        ...(update.folderId ? { folderId: update.folderId } : {}),
        attributes: { ...record(current.attributes), airunoteBook: planning, ...(details ? { airunoteKinds: details } : {}) },
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
        const details = readKindDetails(current.attributes);
        if (change.kind === 'status' && change.status !== 'cancelled') {
          if (planning.kind === 'goal' && details?.goal && (details.goal.current >= details.goal.target ? 'complete' : 'open') !== change.status) throw new AppError('Open the goal and record progress to change its completion.', 400, 'GOAL_PROGRESS_REQUIRED');
          if (planning.kind === 'task' && details?.taskMode === 'list') fields.checklist = fields.checklist.map(step => ({ ...step, done: change.status === 'complete' }));
        }
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

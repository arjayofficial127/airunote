# 🚀 AIRUNOTE FUTURE TODO
## Prioritized Feature Roadmap

**Status:** PLANNING  
**Last Updated:** Phase 3 Complete (Current MVP)  
**Purpose:** Track future enhancements and features

---

## 📊 CURRENT STATE

### ✅ Implemented (MVP)
- Folder CRUD (create, read, update, delete)
- Document CRUD (create, read, update, delete)
- Document types: TXT, MD, RTF
- Folder tree navigation
- Move operations (folder/document)
- Paste Dock (auto-detect content type)
- Optimistic UI updates
- Error handling & loading states
- Backend sharing engine (Phase 2 - no UI yet)
- Backend audit logging (Phase 3 - no UI yet)

### ❌ Not Yet Exposed in UI
- Sharing features (backend ready)
- Link sharing (backend ready)
- Revision history (backend ready)
- Audit logs (backend ready)
- Shortcuts (backend ready)
- Document state management (archived/trashed)
- Visibility settings (private/org/public)

---

## 🎯 PRIORITY RECOMMENDATIONS

### High Priority (Quick Wins)
1. **Share UI** - Backend ready, high value
2. **Link Sharing UI** - Backend ready, quick win
3. **Document Search** - Essential feature
4. **Archive/Trash System** - Backend ready, improves UX
5. **Recent Documents** - Quick, useful
6. **Breadcrumbs** - Improves navigation

---

## 📋 FEATURES BY DIFFICULTY

### 1️⃣ QUICKLY (1-2 hours)

#### Document Search (Basic Name Search)
- **Backend:** Add search query to repository
- **Frontend:** Search input + filtered results
- **Effort:** ~1 hour
- **Priority:** HIGH

#### Keyboard Shortcuts
- **Frontend:** Add keyboard event handlers
- **Shortcuts:**
  - `Ctrl+N` / `Cmd+N` - New document
  - `Ctrl+F` / `Cmd+F` - Search
  - `Ctrl+K` / `Cmd+K` - Quick actions
  - `Ctrl+/` / `Cmd+/` - Show shortcuts
- **Effort:** ~1 hour
- **Priority:** MEDIUM

#### Copy Document Link
- **Backend:** Already exists (`shareViaLink`)
- **Frontend:** Button + copy to clipboard
- **Effort:** ~30 minutes
- **Priority:** MEDIUM

#### Document Type Icons Enhancement
- **Frontend:** Already have icons, enhance styling
- **Effort:** ~30 minutes
- **Priority:** LOW

#### Empty State Improvements
- **Frontend:** Better messaging/illustrations
- **Effort:** ~1 hour
- **Priority:** LOW

#### Recent Documents List
- **Backend:** Query by `updatedAt DESC`
- **Frontend:** New component + hook
- **Effort:** ~1.5 hours
- **Priority:** HIGH

---

### 2️⃣ SLIGHTLY QUICK (2-4 hours)

#### Document Search (Full-Text)
- **Backend:** PostgreSQL full-text search on `canonicalContent`
- **Frontend:** Search UI with results highlighting
- **Effort:** ~3 hours
- **Priority:** HIGH

#### Folder Breadcrumbs
- **Backend:** Get parent chain (recursive query)
- **Frontend:** Breadcrumb component
- **Effort:** ~2 hours
- **Priority:** HIGH

#### Document Preview in List
- **Frontend:** Truncate content display (first 100 chars)
- **Effort:** ~1 hour
- **Priority:** MEDIUM

#### Bulk Operations
- **Frontend:** Checkbox selection + bulk actions
- **Actions:** Delete, Move, Archive
- **Effort:** ~3 hours
- **Priority:** MEDIUM

#### Export Document
- **Frontend:** Blob download (download as .txt/.md)
- **Effort:** ~1 hour
- **Priority:** LOW

#### Document Word/Char Count
- **Frontend:** Calculate on content change
- **Effort:** ~1 hour
- **Priority:** LOW

---

### 3️⃣ FROM SCRATCH BUT STILL QUICK (4-8 hours)

#### Share UI (Share to User/Org)
- **Backend:** ✅ Already implemented
- **Frontend:** Share modal + user picker + permission toggle
- **Components:**
  - `ShareModal.tsx` - Main share interface
  - `UserPicker.tsx` - Select users from org
  - `PermissionToggle.tsx` - View-only vs Edit
- **Effort:** ~6 hours
- **Priority:** HIGH

#### Link Sharing UI
- **Backend:** ✅ Already implemented
- **Frontend:** Generate link modal + copy + password option
- **Components:**
  - `LinkShareModal.tsx` - Generate/copy link
  - Password protection toggle
- **Effort:** ~4 hours
- **Priority:** HIGH

#### Shared With Me View
- **Backend:** Query shares where `grantedToUserId = currentUser`
- **Frontend:** New page + filtered tree
- **Route:** `/orgs/[orgId]/airunote/shared`
- **Effort:** ~6 hours
- **Priority:** MEDIUM

#### Document Revisions (View History)
- **Backend:** ✅ Already implemented (`airu_document_revisions`)
- **Frontend:** Revision timeline + restore
- **Components:**
  - `RevisionHistory.tsx` - Timeline view
  - Restore button per revision
- **Effort:** ~5 hours
- **Priority:** MEDIUM

#### Archive/Trash System
- **Backend:** Update `state` field (already in schema)
- **Frontend:** Archive/trash buttons + filtered views
- **Components:**
  - Archive button in document/folder actions
  - Trash view page
  - Restore from trash
- **Effort:** ~6 hours
- **Priority:** HIGH

#### Folder/Document Shortcuts
- **Backend:** ✅ Already implemented (`airu_shortcuts`)
- **Frontend:** Star/pin UI + shortcuts page
- **Components:**
  - Star icon in folder/document list
  - Shortcuts page (`/orgs/[orgId]/airunote/shortcuts`)
- **Effort:** ~5 hours
- **Priority:** MEDIUM

---

### 4️⃣ MODERATE (1-2 days)

#### Real-Time Collaboration (Shared Content Editing)
- **Backend:** WebSocket server + shared content updates
- **Frontend:** Collaborative editor (Tiptap collaboration)
- **Tech:** Socket.io or WebSockets
- **Effort:** ~2 days
- **Priority:** MEDIUM

#### Document Templates
- **Backend:** Template folder/document system
- **Frontend:** Template picker + apply template
- **Effort:** ~1.5 days
- **Priority:** LOW

#### Advanced Search (Filters)
- **Backend:** Multi-parameter search query
- **Frontend:** Advanced search modal with filters
- **Filters:** Type, date range, folder, owner
- **Effort:** ~1 day
- **Priority:** MEDIUM

#### Document Tags/Labels
- **Backend:** New `airu_tags` table + junction table
- **Frontend:** Tag input + filter by tag
- **Schema:** `airu_tags`, `airu_document_tags`
- **Effort:** ~1.5 days
- **Priority:** LOW

#### Document Comments/Annotations
- **Backend:** Comments table + API
- **Frontend:** Comment sidebar + inline annotations
- **Schema:** `airu_comments` (document_id, user_id, content, position)
- **Effort:** ~2 days
- **Priority:** LOW

#### Folder/Document Duplication
- **Backend:** Deep copy logic (recursive folder copy)
- **Frontend:** Duplicate button + confirmation
- **Effort:** ~1 day
- **Priority:** MEDIUM

---

### 5️⃣ HARD BUT WORTH IT (3-5 days)

#### Real-Time Sync (Conflict Resolution)
- **Backend:** Operational transforms or CRDTs
- **Frontend:** Conflict resolution UI
- **Tech:** Yjs, Automerge, or custom OT
- **Effort:** ~5 days
- **Priority:** MEDIUM

#### Version Control (Git-like)
- **Backend:** Branch/merge logic for documents
- **Frontend:** Version graph + merge UI
- **Effort:** ~4 days
- **Priority:** LOW

#### Advanced Permissions (Granular Per-User)
- **Backend:** Permission matrix system
- **Frontend:** Permission management UI
- **Effort:** ~3 days
- **Priority:** LOW

#### Document Encryption (E2E)
- **Backend:** Encryption/decryption service
- **Frontend:** Key management + encrypted editor
- **Tech:** Web Crypto API
- **Effort:** ~4 days
- **Priority:** LOW

#### Offline Support (PWA + IndexedDB)
- **Backend:** Sync API
- **Frontend:** Service worker + offline queue
- **Tech:** Workbox, IndexedDB
- **Effort:** ~3 days
- **Priority:** MEDIUM

#### AI Features (Summarize, Generate, Translate)
- **Backend:** AI API integration (OpenAI, Anthropic)
- **Frontend:** AI action buttons + results display
- **Features:**
  - Summarize document
  - Generate content
  - Translate document
  - Improve writing
- **Effort:** ~3 days
- **Priority:** LOW

---

### 6️⃣ HARD BUT CAN BE MVP 2 OR 3 (1-2 weeks)

#### Full Workspace Sync (Multi-Device)
- **Backend:** Sync protocol + conflict resolution
- **Frontend:** Sync status + conflict resolution UI
- **Effort:** ~1.5 weeks
- **Priority:** LOW

#### Document Embedding (Embed in Other Docs)
- **Backend:** Reference system + rendering
- **Frontend:** Embed picker + embedded viewer
- **Effort:** ~1 week
- **Priority:** LOW

#### Workspace Templates (Entire Folder Structures)
- **Backend:** Template system + instantiation
- **Frontend:** Template gallery + preview
- **Effort:** ~1 week
- **Priority:** LOW

#### Advanced Analytics (Usage, Popular Docs)
- **Backend:** Analytics aggregation
- **Frontend:** Dashboard + charts
- **Metrics:** Views, edits, shares, popular docs
- **Effort:** ~1.5 weeks
- **Priority:** LOW

#### Plugin System (Extensions)
- **Backend:** Plugin API + sandbox
- **Frontend:** Plugin marketplace + runtime
- **Effort:** ~2 weeks
- **Priority:** LOW

#### Mobile App (React Native)
- **Backend:** Mobile-optimized API
- **Frontend:** Full React Native app
- **Effort:** ~2 weeks
- **Priority:** LOW

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 4: Quick Wins (Week 1)
1. Recent Documents List
2. Document Search (Basic Name Search)
3. Keyboard Shortcuts
4. Copy Document Link

### Phase 5: Sharing UI (Week 2)
1. Share UI (Share to User/Org)
2. Link Sharing UI
3. Shared With Me View

### Phase 6: UX Improvements (Week 3)
1. Folder Breadcrumbs
2. Archive/Trash System
3. Document Preview in List
4. Document Revisions (View History)

### Phase 7: Advanced Features (Week 4+)
1. Full-Text Search
2. Bulk Operations
3. Folder/Document Shortcuts
4. Real-Time Collaboration (if needed)

---

## 📝 NOTES

### Backend Ready (No Backend Work Needed)
- ✅ Share UI (all share types)
- ✅ Link Sharing
- ✅ Document Revisions
- ✅ Shortcuts
- ✅ Archive/Trash (just update `state` field)

### Requires Backend Work
- Document Search (full-text indexing)
- Tags/Labels (new schema)
- Comments (new schema)
- Real-time collaboration (WebSocket server)
- Analytics (aggregation queries)

### Architecture Considerations
- All features must respect Constitution v1.0
- Maintain org boundary enforcement
- Owner-only delete privilege
- Privacy-first defaults

---

## 🔄 UPDATES

- **2026-02-21:** Initial TODO created after Phase 3 completion
- Track implementation status as features are completed
- Update priority based on user feedback

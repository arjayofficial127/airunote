# Airunote Book integration

Implemented locally on `codex/airunote-book-integration`. No deployment, production migration, or import of the standalone notebook's saved data was performed.

## Entry and behavior

Open an owned Airunote folder and choose **Book** beside its existing view controls. The route is `/orgs/:orgId/airunote/book/:folderId`; organization authority comes from `OrgSessionProvider`, never the URL. Existing folder and lens pages remain available.

Book displays Inbox, Organizer, Calendar, and Context together. Panels stay mounted when hidden. All folders and root-level notes are selected initially. Transient filters, drafts, layout, and panel visibility remain in memory; only explicitly named views are saved.

- Inbox captures tasks, events, notes, goals, and documents without requiring a subfolder or date. Pasted lists are previewed; the remaining preview is retained after a failed item save.
- Organizer offers Tree and aligned Columns views. Folder labels stay on the left and direct document contents on the right. Existing document and folder IDs are retained.
- Calendar supports Day, Monday-to-Sunday Week, Sprint, Month, continuous Year, and Unplanned. Day and Week offer Items, Projects, and Hours. Hours can use one 24-hour column, two 12-hour columns, or three 8-hour columns. Rows expand for readable labels; row spacing is not a duration visualization.
- A calendar placement is either an exact day/time or a broader week, sprint, month, or year. No arbitrary dates, inferred durations, automatic rollover, or duplicate content records are created.
- Context edits the canonical brief for TXT/MD, provides planning, checklist, notes, source links, and new explicit activity history. RTF content is preserved and opens in the existing document editor.
- Task markers cycle open, complete, and cancelled, using a checkmark for complete. Document active/archive/trash lifecycle remains independent.
- Pointer, touch, and keyboard drag handles support folder, day, hour, period, Inbox, and Unplanned targets. Context controls also provide explicit movement without dragging. No external file drop or live Jira integration is introduced.
- Saved views, fresh-ID templates, and previewed atomic batch status/folder/calendar changes are included. Batch updates fail together if any selected item is stale.

## Persistence and boundaries

The integration reuses existing Airunote JSONB attributes and folder metadata. **No schema migration is required for this version.**

`airu_documents.attributes.airunoteBook` stores optional versioned planning and activity. Ordinary existing documents default to processed notes with no calendar placement. Unknown planning versions are preserved and cannot be silently overwritten. `airu_folders.metadata.airunoteBook` stores versioned, revision-guarded sprint definitions, explicitly saved views, and templates for that Book root.

Existing attributes and metadata are merged rather than replaced. Canonical text updates create an existing Airunote revision and keep the deprecated content mirror aligned, so clearing a brief cannot resurrect old fallback text. Pending shared edits, visibility, ownership, and document lifecycle are preserved. JSON writes explicitly encode as text before casting to JSONB, avoiding double encoding with this repository's driver versions.

New Book endpoints are under `/api/orgs/:orgId/airunote/book`. Authentication and organization membership are required. All read-for-update operations additionally check the document owner, folder owner, organization, and selected subtree. Document updates use a timestamp guard and row lock; settings use a revision guard. Batch operations use one transaction and consistent row-lock ordering. Capture respects the existing document quota and creates private MD documents. Folders with required custom attributes must first use the existing document editor to satisfy their schema.

Planning mutations remain owner-only. This does not grant collaborators additional editing rights. Book roots have their own sprint definitions. The J/C/A labels and records in the separate local notebook are not automatically converted into Airunote organizations or users.

The workspace reads the existing Airunote metadata store; it adds no second list request or parallel content database. Full content is requested only when an item is opened, through the lazy loader owned by `HydratedContentProvider`. Requests are deduplicated and late responses from unmounted sessions are ignored. Metadata and content mutations update the same existing store.

Examination definitions, routes, grading, timers, attempts, and reports are not changed. A Book task named “Prepare exam” does not modify examination availability or publication state.

## Local review and verification

The development-only `/dev/book` route renders the actual workspace with injected, isolated in-memory data and a save-failure control. It never writes sample records into an account. Refresh/reset restores samples. Production renders this development route as not found.

Validation:

- Frontend and backend strict TypeScript checks passed.
- Focused frontend and backend lint passed.
- Both production builds passed. Existing unrelated import/image and Browserslist warnings remain.
- Fifteen Book contract/PostgreSQL tests passed against a disposable loopback database. Coverage includes ownership and organization isolation, subtree checks, stale saves, quota, canonical/shared content preservation, JSONB object storage, configuration revisions, and batch rollback.
- Five existing examination access-code, entry-field, and attempt-limit tests passed.
- Hashes of all 94 pre-existing exam-specific TypeScript, CSS, and SQL files remained unchanged.
- Local browser checks verified shared selection/save behavior, retained failed drafts, panel continuity, capture, calendar hours/year, and sprint placement. Additional responsive and examination-review evidence is saved with the local verification artifacts.

Verification artifacts are kept outside version control under `output/book-integration/`. Disposable database credentials are under the already ignored `backend-node/.smoke/` directory.

Production sign-in, real account persistence, real collaborative use, and participant submission against a live examination were not exercised. These are not represented by the isolated review screen. No production writes or deployment were performed.

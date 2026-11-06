# Item kinds

Implemented from the approved input/created-view proposal, 7 November 2026.

Five kinds share a title, body, folder, planning, identity and references. The same canvas is used before and after creation; saved changes autosave after a short pause. New items require an explicit Create action. Dirty-close protection and per-account session drafts cover unfinished input and stale-revision conflicts.

| Kind | Distinct behavior |
| --- | --- |
| Task | Single completion, or a Task List with editable checklist rows and progress. All steps done completes a list; reopening a step reopens it. |
| Event | Required date and same-day start/end in Singapore time, optional location/meeting link and agenda. |
| Note | Direct writing, Markdown controls and preview, optional checklist. Existing TXT and rich text retain their formats. |
| Goal | Success measure, unit, current and target; progress history and optional linked next task. Completing a task does not invent goal progress. |
| Document | Private working draft, explicit immutable ready versions, restore as working draft, Markdown/text download, copy and browser Print/PDF. |

Task List is a Task mode. Daily remains the existing dated checklist template. Existing items are not migrated or reclassified by this release. Converting a saved item requires an explicit confirmation and retains its shared content, folder, ID and references.

## Storage and compatibility

`airunoteBook` planning is unchanged. Optional, versioned `attributes.airunoteKinds` holds kind-specific fields and server-managed goal/version history. Client write fields are strictly validated; clients cannot forge release/history entries. Ready content snapshots use existing canonical document revisions, indexed by document-scoped IDs and SHA-256. Reads and writes retain owner, organisation, workspace-root and optimistic-revision checks. Unsupported metadata is preserved rather than rewritten. No database migration or new dependency is required.

Deploy the backend before the frontend for immediate availability. An authenticated capabilities endpoint prevents new kind fields being sent to an older API. Advanced Goal/Document creation stays disabled until supported. Basic capture remains compatible with the previous API. Existing stored goals/documents do not depend on local browser storage.

Reminders are local in-app banners while Airunote is open, with device-scoped dismissal. They do not promise background, email or push delivery. Events currently use Singapore time and same-day slots. Share a copy exports content; it does not change visibility, create a hosted share link or send anything to another person. Browser Print/PDF opens the system print flow.

## Validation

- Backend build; 33 contract/integration tests against the isolated `book_test` database. Coverage includes list status, event validation, goal metrics/history/link scope, immutable/idempotent ready versions, stale writes, ownership and kind conversion.
- Frontend types, focused lint and isolated Next production build.
- Existing editor-tab, pane, layout, destination and agenda regressions.
- Real local browser creation/persistence for all five kinds and Task List; rapid checkbox edits, goal updates, document version recovery/export, draft reload and guarded close, in-app reminder delivery/dismissal.
- Light/Charcoal and narrow/desktop rendering; long checklist text grows without clipping. Existing rich-text table/bold content and mobile question preview inspected.

The disposable local review uses ports 4320/4321 and database 55434. Integration tests use only port 54329. Production data and visibility are unchanged by the implementation/QA.

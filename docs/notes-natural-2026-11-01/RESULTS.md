# Natural Notes workflow

Implemented on `main` from base `15d97ba5e7e7159fb61c04d0b20f9cb4284297ce`, following the user's approval to implement the consolidated proposal and push to main.

## Result

- Inbox stays left of Folders. Its independently scrolling list sits above a fixed multiline composer. Note is the default; Enter saves, Shift+Enter adds a line. Paste-list review retains only unsaved entries after a partial failure.
- The Airunote brand image replaces the rail's placeholder character, with a visible dark-theme treatment.
- Plan defaults to Today, Tomorrow and Later. Broad week/sprint/month/year plans retain their meaning; past entries remain collapsed on their original dates. Calendar, List, Canvas, Board and Study remain accessible through Views.
- Optional Inbox review offers Today/Later/Done for actionable entries and Keep/File for notes. Dragging onto a day schedules and processes the entry.
- Note appears on selection; closing it returns the space to Plan. Pin keeps the pane available. Pane expansion and horizontal order remain usable on phones.
- Direct writing has version-checked autosave, Undo, explicit retry/discard and session-scoped draft recovery. Rich text supports normal formatting and tables; custom markup can be edited as exact HTML source.
- Resume preferences are scoped by organization and user: selected note, folder/view, folder disclosure, panels, theme and calendar settings. Scroll and unsaved capture/body drafts stay in the browser session. A new day resets the planning anchor to today. These preferences do not replace provider-owned data or authorization.
- Labels are Inbox / Folders / Plan / Note, Workspace, Loose notes, Not scheduled and Done / cancelled.

## Validation

- Frontend production build, including lint and TypeScript: passed. Existing repository warnings remain.
- Focused frontend lint: no warnings or errors. Backend build and focused backend lint: passed.
- Four agenda tests: passed, including Sunday/Monday, year boundary, broad plans, unscheduled entries and completed/cancelled filtering.
- Eighteen Book contract/PostgreSQL integration tests: passed against the explicitly guarded `127.0.0.1:54329/book_test` database. Legacy plain-brief updates still cannot flatten RTF; explicit RTF updates preserve format, revisions, shared edits and conflict protection. Jest emitted its existing open-handle warning before shutdown.
- One coordinated browser smoke session recorded 21 checkpoints in `browser-results.json`. Two issues discovered during that session (capture focus and rich-text integration) were corrected and checked specifically; no second full smoke sweep.
- Five widths (1920, 1440, 1024, 768, 390) in both themes: no document overflow, composer stays within viewport, horizontal panel order retained. Mobile expanded Note and screenshots inspected.
- Real saves/reloads, concurrent version conflict, failed autosave recovery, partial import retry without duplication, drag scheduling, optional review, loaded saved views, preferences and scroll resume verified.
- Exam editor's mobile question/date previews inspected. Actual local mobile participant flow completed with two persisted answers and a database-confirmed completed attempt.
- No JavaScript page errors. Only the disposable local review database was written.

## Release limits

No schema migration. The rich-text save contract adds optional `contentType: 'RTF'`; the backend must be deployed from this change for the new rich-text writing action to succeed. Production deployment is not established by the local tests or a Git push. Backend auto-deploy was last recorded as disabled in the shared handoff.

The pictured native tray's “Open Quick Entry” handler was not found in Airunote or Coach. No native tray integration is claimed or shipped.

Existing unrelated instruction-file changes and earlier QA directories were preserved and excluded from this commit. The landing page, live marketing demo and exam implementation were not redesigned.

## Evidence

- [Planning](planning.png)
- [Writing, dark theme](writing-dark.png)
- [Browser checkpoint details](browser-results.json)
- Additional private local logs/screenshots: `backend-node/.smoke/notes-natural-2026-11-01/`.

Run the agenda checks with `pnpm exec tsx --tsconfig ../frontend/tsconfig.json ../frontend/scripts/notes-agenda.test.ts` from `backend-node`. The disposable review startup commands are in `backend-node/scripts/ux-qa/run-local.sh`; do not run the backend with production `.env` defaults.

# Readable Notes workspace

User approved the four-column mockup and requested implementation, push and exactly one browser smoke pass on 1 November 2026 (Asia/Singapore).

## Implementation plan

- Preserve Inbox → Folders → View → Content at every width, with contained horizontal scrolling and panel expansion on smaller screens.
- Increase primary type and action targets; retain Light and Charcoal appearances.
- Make Add to Inbox the explicit capture action. Retain Enter capture, paste preview and failed-save draft protection.
- Simplify the global toolbar while retaining panel controls, appearance, Library and batch actions.
- Improve folder icons, selection and counts without changing hierarchy or records.
- Explain scheduled versus scoped note counts using existing calendar data, with a reversible See all notes action.
- Show actual note text, kind, placement, checklist and context notes in Content. Move/Schedule actions open the existing editor at the relevant control. Checklist updates reuse the version-checked save action.
- Keep provider ownership, API contracts, examination behavior and existing uncommitted work intact. No sample mockup copy is inserted into user notes.

## Validation plan

Run the frontend production build (including strict typing and lint), then one coordinated browser smoke session against the existing isolated local PostgreSQL fixture. Cover capture/edit/reload/checklist, search and scope, folders and views, batch/panel controls, draft retention, light/dark and desktop/tablet/mobile widths, measured page overflow, and examination editor/preview/mobile question states. Inspect screenshots from that pass. No production content writes.

## Verified results

- Frontend production build passed, including strict TypeScript and lint. Existing unrelated warnings remain.
- One browser session against localhost:4320 and the disposable localhost:4321 API verified capture, note editing, checklist completion through reload, moving to Book, scheduling to 1 November, search/scope counts, See all notes/return, folder recovery, saved-view browsing, Library/batch access and draft retention through expansion and editor navigation.
- A simulated local capture failure retained the draft and displayed a recoverable error.
- Light and Charcoal at 1920, 1440, 1024, 390 and 320 pixels retained the horizontal panel sequence with zero page overflow and no clipped measured controls. Expanded mobile reading/editor views were also inspected.
- Existing exam editor and mobile choice/date previews opened. The local participant completed both answer fields; a read-only database check confirmed two saved answers.
- Final exam submission is **not verified**: the automation waited for completion at the confirmation step and timed out before confirming. The local attempt remains in progress. No second smoke session was run, as requested. No examination source files changed.
- No JavaScript page errors were observed before that tooling timeout.
- Final source review excluded unplanned entries from the Day scheduled count and corrected singular note wording. Strict typing and focused lint were rerun for that small correction; no second browser smoke pass.
- `git diff --check` passed. No new API calls, provider ownership changes, schema changes, migrations or production content writes.

Local screenshot/build evidence is under `backend-node/.smoke/notes-readable-2026-11-01/` (ignored private artifacts). This includes desktop/tablet/mobile Light and Charcoal, mobile reading/editor and examination question/date screenshots. Existing local fixture data was reused without reseeding; one clearly named Notes smoke document and one local exam attempt were added.

The requested push targets the current `codex/airunote-ux-transformation` branch. Production main/deployment is outside this branch push.

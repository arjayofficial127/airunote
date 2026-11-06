# Daily notes

Today in the Notes rail opens one owned, private note for the Singapore calendar date. The reading heading uses one full date, such as Friday, November 6, 2026. The add field and editable checklist lead the page. Enter adds a line and changes save automatically. Notes, Close the day and planning start collapsed below the checklist.

## Thirteen design questions

1. What is the smallest useful daily object? One normal note with a checklist.
2. Must the user name or file it? Today supplies the date and workspace home.
3. Does visiting the app create clutter? A day is created only when Today is opened.
4. What happens on a second click or another tab? The server serializes opening by owner, workspace and date, then returns the existing note.
5. What if the date changes while the app stays open? Each click computes the current Singapore date.
6. Can a rename or move break Today? A date marker travels with the original note.
7. Can an existing dated note be reused? A supported Markdown note with the exact full date title in Home, or a scheduled note with the matching full date or `YYYY-MM-DD · Weekday` title in a nested folder, is reused with its content, folder and planning preserved. Ambiguous legacy matches require an explicit choice. Ordinary scheduled tasks and unrelated notes keep their existing editor.
8. What happens to archived notes? Today asks for restoration instead of creating another note.
9. Is a new checklist item easy to enter? Enter or the plus control adds it and keeps focus in the entry field.
10. Can items be corrected or completed? Edit text inline, tick the checkbox or remove the item.
11. What happens when saving fails or another tab edits the note? Revision checks preserve the server version, the local draft survives a reload, and retry or saving a copy provides recovery.
12. Does the feature require a large form? The date and checklist lead the page. Optional notes, reflection and planning sit below it. Today opens a single editor, hides the middle view and uses the remaining desktop space. Plan stays available from the navigator.
13. Do existing boundaries still apply? Ownership, organisation membership, document quotas, draft close guards and existing note/exam flows retain their normal entry points.

## Implementation

Daily creation uses a transaction advisory lock and existing document creation/validation. The date marker is stored in document attributes, outside the planning contract. No schema migration is needed. Existing canonical content, checklist planning and revision guards are reused.

The compact editor keeps a session-local draft, saves committed checklist changes after 600 ms, and includes an unfinished line when Save now or Save and close is used. Its local draft is scoped by organisation, owner and note ID.

Close the day reuses a normal planning note prefixed with `Close the day` and a newline. Existing other planning notes are preserved. Reflections use the same revision checks, draft recovery and save-copy path as checklist edits. Long checklist text wraps in an auto-sized field. Daily autosaves use the inline Saved status without a duplicate workspace banner.

Active editor tabs reveal themselves when opened, restored or resized, with an All open notes menu for overflow. Plan combines its heading and scope, provides an accessible Singapore-time date description, labels recognized daily rows Daily checklist with original title/folder/schedule retained in accessible detail, and aligns quiet backlog counts without changing grouping or disclosure state.

## Verification

- Backend and isolated frontend production builds passed.
- Backend contract/integration suites passed 26 tests, including compatibility, nested daily-note adoption and ambiguous-date protection.
- Existing editor, pane, layout, destination and agenda checks passed.
- Browser checks passed adding, editing, checking, removing, reopening and reloading items, unfinished-line recovery, dirty-close protection, network recovery, stale-save protection and saving a copy.
- Browser clock checks passed across Singapore midnight.
- The existing standard note editor and Markdown preview passed.
- Eight light/charcoal and 320/390/768/1440 px layout combinations had no document overflow or browser runtime errors.
- The Plan scope selector, day navigation and user-opened backlog disclosure retained their behavior. The date entry uses a concise daily label while ordinary entries retain their title and metadata.
- Production deployment is recorded separately in the shared handoff.

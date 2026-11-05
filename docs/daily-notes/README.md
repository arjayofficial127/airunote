# Daily notes

Today in the Notes rail opens one owned, private note for the Singapore calendar date. The title uses the full date, such as November 5, 2026. Its checklist is immediately editable. Enter adds a line and changes save automatically. Notes and planning are available below the checklist.

## Thirteen design questions

1. What is the smallest useful daily object? One normal note with a checklist.
2. Must the user name or file it? Today supplies the date and workspace home.
3. Does visiting the app create clutter? A day is created only when Today is opened.
4. What happens on a second click or another tab? The server serializes opening by owner, workspace and date, then returns the existing note.
5. What if the date changes while the app stays open? Each click computes the current Singapore date.
6. Can a rename or move break Today? A date marker travels with the original note.
7. Can an existing dated note be reused? A supported Markdown note with the exact date title in Home is adopted with its content and planning preserved.
8. What happens to archived notes? Today asks for restoration instead of creating another note.
9. Is a new checklist item easy to enter? Enter or the plus control adds it and keeps focus in the entry field.
10. Can items be corrected or completed? Edit text inline, tick the checkbox or remove the item.
11. What happens when saving fails or another tab edits the note? Revision checks preserve the server version, the local draft survives a reload, and retry or saving a copy provides recovery.
12. Does the feature require a large form? The date and checklist lead the page. Optional notes and planning sit below it. An unused middle view is hidden when Today opens.
13. Do existing boundaries still apply? Ownership, organisation membership, document quotas, draft close guards and existing note/exam flows retain their normal entry points.

## Implementation

Daily creation uses a transaction advisory lock and existing document creation/validation. The date marker is stored in document attributes, outside the planning contract. No schema migration is needed. Existing canonical content, checklist planning and revision guards are reused.

The compact editor keeps a session-local draft, saves committed checklist changes after 600 ms, and includes an unfinished line when Save now or Save and close is used. Its local draft is scoped by organisation, owner and note ID.

## Verification

- Backend and isolated frontend production builds passed.
- Backend contract/integration suites passed 23 tests, including five daily-note regression tests.
- Existing editor, pane, layout, destination and agenda checks passed.
- Browser checks passed adding, editing, checking, removing, reopening and reloading items, unfinished-line recovery, dirty-close protection, network recovery, stale-save protection and saving a copy.
- Browser clock checks passed across Singapore midnight.
- The existing standard note editor and Markdown preview passed.
- Eight light/charcoal and 320/390/768/1440 px layout combinations had no document overflow or browser runtime errors.
- Production deployment is recorded separately in the shared handoff.

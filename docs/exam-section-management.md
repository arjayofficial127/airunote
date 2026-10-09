# Exam section management

Named sections are optional. General questions is a virtual group for questions with no section and always comes first, matching respondent ordering. Sections can be renamed, pinned, reordered, expanded/collapsed, or deleted in an unsaved draft. New sections use the next available Section N title.

Deleting an empty section is immediate and reversible with Undo. Deleting a populated section opens an accessible modal, defaults to the preceding section (General for the first/only section), and requires a destination. Questions append in their existing order; question IDs, options, grading, timers, requirements, and pins are preserved. The source section's pin disappears with the section. Undo restores the prior grouping until another structure/content edit or save.

The editor updates sections and questions together. Save persists the full definition in a transaction. Both API and JSON import reject missing, foreign, duplicated, or conflicting section references. A row lock serializes definition replacement against attempt creation; replacement rechecks attempts inside the transaction, and attempt creation rejects an outdated exam snapshot. Existing responses lock structural controls. Failed saves retain the draft.

Appearance entry previews now use current draft duration, question count, attempt limit, and required identity fields. Question screens remain explicitly labelled samples. Color controls have a full-width row to keep names readable. Supplied titles, descriptions, instructions, questions, answer keys, and production status are not rewritten by this release.

## Verification

- Backend and frontend production builds pass.
- `tests/integration/exam-sections.smoke.ts`: lossless eight-question move, destination append order, pins, zero sections, invalid destinations, duplicated/foreign references, API save/reload, respondent order, structural lock, transaction-level lock, stale attempt snapshot rejection.
- Browser: modal destination/default, Escape cancellation, General move, populated and empty deletion Undo, new-section focus, unsaved navigation warning, save/reload.
- Editor measured at 320, 390, 768, and 1440 pixels; settled mobile controls stay inside the container. Preview checked with Autumn, Plain, and Wrapped in Joy at mobile width.
- Two implementation/smoke passes; no production exam content mutations or production test attempts.

## Remaining visual opportunity

The long all-caps title and repeated introductory metadata create a dense first screen. A future presentation-only change can separate the campaign heading, exam title, and complete instructions into a clearer hierarchy while retaining every supplied sentence. A larger optional preview would reduce nested scrolling. Neither requires deleting or shortening the supplied content.

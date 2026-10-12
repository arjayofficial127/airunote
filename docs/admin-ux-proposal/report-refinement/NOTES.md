# Reports refinement — 12 October 2026

Local frontend changes only. Existing in-progress admin redesign preserved. No backend changes, migrations, real data writes, push, or deployment.

The reports view now prioritizes intervention: compact summary filters; report tabs beneath the title; an attention queue with direct attempt review and eligible five-minute continuation; a consolidated toolbar; advanced filters disclosed together with active-filter count and reset; grouped exports and secondary actions; empty live monitoring and test records collapsed; narrow-panel respondent cards with explicit full-table/all-column access.

Every prior filter, sort, classification, export format, reporting view, detail field, recovery operation, and preview-record separation remains. Attention is computed from existing `needsAdmin`, `eligibleForContinue`, and classification fields. The attention queue covers all participant attempts and is separate from the filtered results. Refresh failures retain visible last-received data with retry. The development sandbox instructions collapse on Reports to reflect the actual report's usable space.

Checks: TypeScript and focused lint; 12 layout checks (three reporting views at 320, 390, 780, 1440px), no page overflow or runtime errors; direct review and recovery-dialog access; advanced-filter/reset; all columns/full table; export and secondary-menu availability. Connected fixture flow is recorded in flow.log. Screenshot inspection includes the user's narrow desktop-panel width and dark mode.

10/10 is a usability target, not an objective score claimed by this change. Review the action-first layout at localhost:3000/dev/admin before release.

## Approved four-group layout

Applied locally on 2026-10-12. Essential rows show Identity, Score & attempt, Duration & events, and Status & actions. Desktop uses four columns; narrow panels use two columns over two rows. The exam title appears only in the report heading. All-column table access and existing reporting/recovery functionality are preserved. Retake remains behind the row's more-actions disclosure and confirmation, while eligible continuation is directly available.

Verified TypeScript, focused lint, whitespace, eight responsive theme/width combinations (320, 390, 640, 1440), table/grouped transitions, attempt detail and recovery dialogs in the isolated sandbox. JPEG evidence: `grouped-{light,dark}-{width}.jpg`. No backend changes or release performed.

## Compact mobile cards and controls

Duration and focus events now share one line. Every mobile attempt has a separate border, background and spacing; identity/score stay together above timing and the action footer. The toolbar exposes one View selection and one Sort selection with direction. Narrow headers are compact, timestamps are concise, and empty monitoring becomes a quiet status line. Automatic polling pauses while menus or attempt/recovery dialogs are open, then resumes. Last-update text identifies refresh failures. Every report field and export remains accessible.

Verified with five mocked participant records, light/dark themes at 320/390/640/1440, menu/scroll retention across polling intervals, dialog pause/resume, sorting, full-table access and recovery dialogs. No backend mutations occurred. TypeScript, focused lint and whitespace checks passed. Evidence: compact-card-*.jpg. Local only.

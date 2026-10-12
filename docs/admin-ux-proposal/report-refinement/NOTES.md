# Reports refinement — 12 October 2026

Local frontend changes only. Existing in-progress admin redesign preserved. No backend changes, migrations, real data writes, push, or deployment.

The reports view now prioritizes intervention: compact summary filters; report tabs beneath the title; an attention queue with direct attempt review and eligible five-minute continuation; a consolidated toolbar; advanced filters disclosed together with active-filter count and reset; grouped exports and secondary actions; empty live monitoring and test records collapsed; narrow-panel respondent cards with explicit full-table/all-column access.

Every prior filter, sort, classification, export format, reporting view, detail field, recovery operation, and preview-record separation remains. Attention is computed from existing `needsAdmin`, `eligibleForContinue`, and classification fields. The attention queue covers all participant attempts and is separate from the filtered results. Refresh failures retain visible last-received data with retry. The development sandbox instructions collapse on Reports to reflect the actual report's usable space.

Checks: TypeScript and focused lint; 12 layout checks (three reporting views at 320, 390, 780, 1440px), no page overflow or runtime errors; direct review and recovery-dialog access; advanced-filter/reset; all columns/full table; export and secondary-menu availability. Connected fixture flow is recorded in flow.log. Screenshot inspection includes the user's narrow desktop-panel width and dark mode.

10/10 is a usability target, not an objective score claimed by this change. Review the action-first layout at localhost:3000/dev/admin before release.

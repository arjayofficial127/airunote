# Entry details

`entryField` marks ungraded date or short-text questions collected before Start exam. They remain in the data model so existing answers and reports keep their IDs, but are excluded from public question order, question count, timers and grading. Date fields display a read-only ticking Philippine clock synchronized to overview.serverTime. The server ignores supplied dates and records an ISO timestamp when accepting the start request. Text fields are validated before attempt creation; all entry answers are inserted in the same transaction as the attempt.

The editor separates these fields into Your details; JSON preserves the flag. The report answer matrix retains the entry values. Existing answers are not deleted or rewritten.

Deployment order:
1. Run scripts/migrate-exam-entry-fields.ts with an explicit DATABASE_URL.
2. Deploy backend and frontend together.
3. Run scripts/move-partner-entry-fields.ts for the existing 20-question draft. It marks only the two known ungraded field IDs and updates the old entry instructions. It preserves the draft status and all attempts.

Validation: `npx tsx --test tests/unit/exam-entry-fields.node.ts`, backend and frontend TypeScript checks, mobile and desktop appearance preview.

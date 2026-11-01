# Spaces, Views and links: local review

Verified 1 November 2026, 23:56 SGT. Isolated checkout `/home/ao/work/aotxnologies/airunote-spaces-preview`, branch `codex/spaces-views-links`, based on `90b3d90`.

## Behavior

- The Notes navigator uses Spaces. Selecting one reveals its contents under its name, with Details available explicitly. Existing draft guards, pane preferences and kept-open contexts remain.
- View choices are Plan, Calendar, List, and saved Box, Board, Canvas, Calendar and Study views. Stored folder/lens IDs and API contracts are retained.
- Add Link searches existing owned notes and Spaces in the organization. Links are references persisted on the destination Space, without moving or copying originals. Linked notes participate in the Space's views; linked Spaces open their original contents. Source indicators distinguish references.
- The Links section remains available across views and filters. Removing a link preserves its original; unavailable references remain removable. Edits through a linked note update the original.
- The authenticated API validates organization, ownership, target state and ancestors, rejects redundant links, serializes concurrent changes, and preserves unrelated metadata. No database migration is required.

## Validation

- Frontend production build, TypeScript and focused Notes/Study/view-modal lint passed. Backend TypeScript build passed. Existing unrelated build warnings remain.
- Seven dedicated PostgreSQL integration tests passed: metadata/original preservation, idempotency/concurrency, unlink, owner/org isolation, self/root/direct-child rejection, lifecycle state, malformed reference preservation.
- Existing pane and sizing/preference migration assertions passed, as did four agenda tests and five exam tests.
- `smoke-results.json` records 68 passing Notes checks. Real local create, link, edit, unlink, refresh, error retention, saved views, details and dirty guards were exercised. Cards/Panels, light/dark, and 320/390/1024/1920 widths were measured. Final heading screenshots additionally cover 1440/390/320. No browser JavaScript errors.
- `exam-results.json` records editor, preview, two-answer mobile flow and submitted result after reload. Submission confirmation was activated with the keyboard. Automated pointer clicks immediately after date editing did not reliably open confirmation; pointer submission is not claimed verified. Exam source was not changed.
- Final desktop/mobile, picker, question and completion screenshots were inspected. The earlier Study assertion incorrectly searched rendered text rather than the title input value; corrected inspection confirmed the linked note and source label.

## Preview and limits

Local UI: `http://localhost:4324/orgs/10000000-0000-4000-8000-000000000028/airunote`. API: port 4325. These use the separate `airunote_spaces_preview` local database. Integration fixtures use `space_links_test`; neither is the parent's active preview database. Services remain running for review.

This branch is local only, not merged into main or deployed. Parent-thread compact Inbox/navigation work after `90b3d90` is intentionally not included in this isolated preview. Preserve that work during a future integration, particularly NotesWorkspace navigation and workspace CSS.

Links currently belong to a Space and are shared by its views. Per-view-only selections, external URLs, shared/foreign-owner targets and recursive inclusion of linked Spaces are not implemented. Existing List/Plan subtree scope is retained. Link endpoints must be deployed together with the frontend before production use.

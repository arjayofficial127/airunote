# Local admin redesign — implementation and test guide

12 October 2026. Implemented locally and approved by the user for commit/push to the review branch `codex/admin-ux-review`. Production `main` remains unchanged. No backend code change, migration, or live data write was performed.

## Start here

Open [the local admin sandbox](http://localhost:3000/dev/admin).

It uses the actual redesigned React components with sample exams and an in-memory API adapter. No sandbox mutation reaches the backend. Refresh resets the sample data. You do not need to sign in to try the sandbox. The route is unavailable in a production build.

Your normal signed-in organization screens also use the redesign. Their Save buttons still call the configured existing backend. The handover records that the local backend configuration can point at the live database; use the sandbox for isolated testing.

## What changed

- Contextual save dock keeps review/save actions within reach on long forms.
- Shared assessment navigation with a remembered light/dark admin theme.
- Searchable exam library, status filtering, remembered list/card view, primary New exam action, direct Edit/Report, and a secondary Duplicate/Archive menu. Restore remains available.
- Dedicated Setup, Questions, Appearance, Preview, Share & access, JSON pro, and Reports destinations.
- Independent exam, appearance, and pending-JSON states; unsaved navigation protection across all three; field-level change review. Publication badges distinguish saved status from draft choices.
- Setup grouped into Details, Timing & attempts, Answering rules, Identity & results. Current-draft summary, explicit device timezone, readable schedule summary, and upfront validation.
- Focused question editor with searchable outline and All questions mode. All five types, section operations, pins, requirements, timers, grading, keys, and explanations remain accessible. Entry fields are editable but cannot be graded or timed.
- Appearance organized by Theme, Opening, Instructions, Brand & artwork, Style & audio, Completion, and All controls. Four starting-design cards, organization templates, explicit application, theme Undo, existing snapshot behavior, and mobile Edit/Preview switching.
- All nine visual preview states with human-readable names. Existing gallery, Pan/Interact, zoom, Fit one/all, expansion, gestures, and respondent renderers retained.
- Separate respondent examiner-code controls and reviewer-code controls, native focus-managed dialogs, copy-once explanation, rotation consequences, status retry, and clipboard fallback.
- JSON text survives tab changes and unrelated visual edits; invalid JSON stays editable; Apply and Save remain separate; download and reload controls added.
- Reports retain all filters, classifications, sorting, polling, timestamps, data, exports, matrix, and question analytics. Essential/all-column views and mobile respondent cards supplement the full table. Filters and sort preferences are remembered in the browser session. Completion-date filtering now uses the displayed device-local date basis.
- Continuation and void actions use explicit dialogs. Continuation retains the fixed five-minute grant and copy fallback; void retains its reason, history, and attempt-allowance behavior.
- Templates retain all editing/default/revision/duplicate/archive controls with visual swatches and unsaved protection. Files retain their original supported formats, visibility, built-ins, usage references, retry, download, removal, and cleanup. Workspace journey preferences retain their minimum-one-app rule.
- Desktop sidebar closes when resizing into mobile so it does not obstruct admin controls.

No participant content, answer key, gift artwork, animation, timer, enforcement, or backend contract was redesigned.

## Suggested review

1. Search for the sample exam, switch card/list view, and open Edit.
2. Change the title; move between setup subsections. Verify the title and dirty state survive.
3. Set Limited/Unlimited attempts, inspect the timezone and response window, and review changes before saving.
4. Use Questions: select each type, switch All questions, add sections, move questions, delete a populated section, and Undo.
5. Edit JSON without applying it, leave the tab, and return. Apply valid JSON; try invalid JSON; inspect its retained error.
6. Open Appearance and try every group. Change a theme, Undo, customize wording, and save appearance independently.
7. Try Visual preview in all nine states; switch phone/desktop; expand; use Gallery, zoom, Fit one/all, and Pan/Interact.
8. Open Share & access. Compare examiner versus reviewer codes; generate/copy/disable the illustrative sandbox code.
9. Open Reports, change filters, inspect all columns, switch matrix/analytics, open an attempt, and inspect continuation/void dialogs.
10. Enable **Simulate save failure**. Verify the draft survives. Turn it off and retry.
11. Enable **Simulate existing attempts**. Structure and JSON editing lock; permitted grading remains editable.
12. Try Templates, Files, Workspace settings, light/dark, and narrow/wide widths.

## Sandbox limits

The sandbox demonstrates UI interaction; it is not a replacement backend or a backend authorization test. Sample codes and continuation links are illustrative. Public exam and saved-admin-test actions are guarded in the sandbox; use Visual preview there. The connected organization screens retain those actions. Upload storage is deliberately unavailable there, while built-in assets remain usable. Actual storage uploads, authentication, production permission enforcement, live timers, and database persistence were not revalidated through production writes.

## Validation

- Frontend TypeScript check passed.
- Frontend production build passed in a separate temporary copy, preserving the running local development server.
- Focused lint passed with the existing ExamImage and direct file-API import warnings.
- Real component browser fixture flow passed: library search, editor navigation, pending JSON retention, invalid/valid JSON application, exam save, appearance save, appearance-only unsaved warning, code generation dialog, continuation generation, and void reason retention.
- 32 responsive checks passed across Setup, Questions, Appearance, Share, JSON, Live attempts, Matrix, and Analytics at 320, 390, 768, and 1440px: no page-wide horizontal overflow or runtime page errors.
- 72 preview combinations passed: nine states × four appearance renderers × mobile/desktop widths. No page-wide overflow or runtime errors.
- Sandbox failure retention and structure-lock simulation passed; no sandbox backend write escaped the in-memory adapter.
- Sandbox create/duplicate workflows and connected-route guards passed.
- Gallery Fit all, Zoom in, Fit one, Interact/Pan controls smoke-tested.
- Representative mobile question/preview and dark admin screenshots inspected. Settled screenshots disable transition capture to avoid measuring the middle of a theme transition.
- Whitespace diff check passed.

Browser fixtures intercept every API call; no test mutations were sent to a real database. Scripts are in `frontend/scripts/admin-qa/`; evidence is in `docs/admin-ux-proposal/implementation-qa/`.

## Quality assessment

The redesign implements the agreed frontend improvements and preserves the existing power. “10/10” remains a usability target, not a measured claim. Your hands-on review should determine whether navigation, editing speed, and confidence reach that target before any release.

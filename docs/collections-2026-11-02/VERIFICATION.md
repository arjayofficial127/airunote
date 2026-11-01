# Folders, collections and sidebar release

2 November 2026 SGT. Implemented in the existing main checkout under the user's explicit main-chat and side-chat handoffs. The Folders + / Done-cancelled switch change was already released in b33ce7b.

## Behavior

Physical containers are Folders; Workspace is the overall environment. Default folder contents use a real Box icon grid, with List, Details and Cards as presentation choices. Direct children are counted; descendants are explicit. Existing saved lenses and IDs remain intact. Folder settings are an explicit action.

Canvas, Book, Study set and curated Board are independent collections with a stable identity, movable home folder and references to original records. Moving and linking preserve identity; duplication creates independent placements referencing the same originals. Chosen references survive source moves; Matching uses a visible folder/title/status rule. Book has ordered, renameable pages and ordered references. Study sets offer collection-local ordered references and inline reading; existing saved Study lenses retain their original renderer. Removing a reference never deletes its source. Workspace Plan/Calendar use original scheduling with an explicit optional folder scope.

Storage is additive in tagged existing lens records. Legacy lens endpoints exclude collections. API mutations validate organization/owner, active ancestors, target availability, revision and page membership inside transactions; original content/planning are not rewritten. No schema migration or destructive conversion.

AJ opens the actual session identity plus Edit profile, Switch workspace and Sign out. A separate sidebar cog owns layout, visible panels, pane sizing/reset, appearance, Archive/Trash, library and batch tools. Search/New remain direct; the redundant global Notes toolbar is removed. Popovers dismiss outside/Escape, fit the viewport and restore keyboard focus. Account navigation respects existing unsaved-draft protection; profile cancellation resets unsaved form values.

## Verification

- Backend TypeScript build and frontend production build pass. Final frontend types pass; focused lint has only the pre-existing profile direct-API import warning.
- Eight isolated collection database tests pass, including 1,000 cross-folder source notes, 13 pages x 20 references, identity-preserving move/reload, independent duplicate placements, link/unlink, matching rules, unavailable/restored references, stale writes, atomic org/owner rejection and home-folder trash promotion.
- Fifteen existing lifecycle/link database tests pass. Existing pane/layout assertions, four agenda and five exam regressions pass. Jest's existing pool/open-handle warning remains after passed integration suites.
- Collection browser passes: 17 setup/Book checks, 12 Canvas/Board/Study and responsive checks, then 23 final checks. The first pass exposed a narrow-menu anchoring issue; the second exposed squeezed phone reference text. Both fixed and verified in the third final pass.
- The browser completed 13 Book pages with 260 references, move/reload/duplicate/link, edited the original through a reference and read the change inline, moved a scheduled original retaining date/time, checked workspace Plan and explicit folder filtering, retried a failed collection-settings save without losing input, and persisted a Board stage after reload.
- Folder direct contents fixture: 3 folders + 100 files = 103 items. Both themes tested at 1912/1024/390/320 CSS pixels, no document overflow; phone reference picker and settings fit.
- Sidebar/account: 36 functional/responsive checks plus 27 final visual/keyboard checks pass. Actual profile save restored the QA user's original name; switch/sign-out tests used only the local QA account. All-hidden recovery, both layouts, sizing/reset, batch tools, Archive/Trash, library, search dismissal and draft cancellation verified. Phone profile/settings fit, trap/restore focus, and all settings remain scrollable.
- Exam editor, preview, two actual phone answers, pointer submission and reload pass; no JavaScript errors. Screenshots inspected.

## Evidence and scope

Checked-in result JSON and selected screenshots sit beside this file. Extensive temporary scripts/logs/screenshots are under /tmp/airunote-collections-* and /tmp/airunote-account-*; isolated app/API ports 4320/4321. Fixtures are local only. The phone collection screenshot predates the separately verified toolbar relocation and is named accordingly. No production user content was mutated during development checks. Existing unrelated instruction edits and historical QA folders are preserved.

Release deployment status is recorded in the shared dated handoff after the main push and provider verification.

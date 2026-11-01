# Panels / Cards batch verification

Implemented following the user's explicit proceed instruction, width-lock report, and subsequent menu/folder-detail requests on 1 November 2026.

## Final behavior

- Panels uses adjoining columns. Cards combines the former Browse/Create presets with a Folders | Inbox navigator. Both expose visibility controls, independent saved widths, pointer/keyboard resizing, multiple folders, Frozen/Following lenses and group layouts.
- Keep my widths now locks each requested width: closing peers, opening context and growing the window do not allocate spare space to remaining panes. Single panes can resize. Auto fit alone fills and redistributes available space. Explicit expansion and temporary Cards phone fitting do not overwrite desktop preferences. Large inner groups scroll within the requested width.
- Lenses visibility is a single saved setting, unaffected by opening notes/folders. Cards provides Show/Hide view plus the Panels menu. All-hidden recovery remains available.
- Clicking folders in the tree or views automatically opens Folder details. Unsaved note/folder changes block context replacement. Folder context and selected tab restore on reload, validating the folder against current ownership. Explicit closing of the last pinned tab closes context without a ghost Note tab.
- Pending Inbox rows expose the existing Archive/Delete action. A separate Review/Hide decisions control retains Keep/File and scheduling actions. Archive / Trash recovery moved to the top ellipsis menu. The redundant Folder details buttons were removed.
- Layout, Panels, ellipsis and other Notes popovers dismiss on outside pointer interaction and Escape. Mobile toolbar menus stay within the viewport.
- Former Browse/Create preferences migrate to Cards while preserving custom widths and the selected note. Legacy Create with a selected note starts without Lenses; the old transient Show view state was never stored. Current visibility is persisted normally.

## Verified

- Final frontend production build, strict TypeScript, focused Notes lint and whitespace checks passed.
- Layout assertions cover exact widths with one/two/three panes and narrow through 4K windows, isolated stable resizing, automatic redistribution/minima, single-pane resizing, and idempotent legacy migration. Existing pane-state assertions passed.
- Four agenda tests and five exam unit regressions passed using isolated local services.
- 102 distinct Notes browser checkpoints passed, with zero JavaScript page errors. Evidence is in smoke-results.json and the included screenshots.
- Actual local capture, Trash/restore, failed deletion retention, new-note save, failed note save/retry/reload, dirty context guards, draft preservation, all-hidden recovery, folder auto-opening, context restoration, pin/close behavior, keyboard/pointer resize and temporary expansion were exercised.
- Actual browser restoration tested both former presets and retained custom widths. Cards exposes multiple folder panes and Frozen/Following lenses; layout switches retain their 2x2 settings.
- Both layouts and themes checked at 3840, 1440, 1024, 390 and 320 CSS pixels with no document overflow. Final mobile menu tests cover every toolbar popover in both themes at 390/320, including outside dismissal, editor fitting and Inbox composer usability. Screenshots were inspected.
- Exam author editor and published preview opened. A fresh local phone participant saved both answers, submitted through confirmation, and retained Answers submitted after reload. Question/date/confirmation/completion evidence and exam-results.json are included.

Two coordinated implementation/smoke cycles were used. The second corrected a mobile Panels-menu placement found by the first responsive pass. Routine selector inspection and the user-added menu requirements were handled within this work.

## Scope and release limits

Frontend-only change. No backend/schema modification, production record write or permanent test-data deletion. The disposable local review database was reused without reseeding; the Inbox deletion test restored its QA note. Local preview uses localhost:4320 and API localhost:4321. Production deployment status is recorded separately in the shared handoff.

Existing unrelated build warnings and missing local upload-service credentials remain. Upload behavior and authenticated production smoke are outside these local checks. Pre-existing AGENTS.md / CLAUDE.md edits and older QA directories were preserved and excluded from this release.

Commands included frontend build, tsc --noEmit, next lint --dir components/notes, backend tsx runners for notes-layout / notes-panes / notes-agenda, and exam access-code / entry-fields / unlimited-attempts tests. Temporary browser scripts and sample authentication state were kept outside the repository.

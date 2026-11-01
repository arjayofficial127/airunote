# Book folder drag verification — 2 November 2026

Request: allow folders to be dragged into the Book being edited.

Implemented on main:
- Drag a navigator folder by its name or grip onto the current Book page to add a reference. Notes use their existing grip.
- Page-specific duplicate protection, visible target highlight and success/duplicate feedback.
- Original folders and notes remain at their homes. Tree-to-tree folder moves retain their existing behavior.
- Keyboard grip controls remain Space / arrows / Space; Escape cancels. Touch scrolling on folder names is preserved, with drag handles and Add references as alternatives.
- Corrected the reference picker's checkbox width and row shrinking discovered during phone testing.

Validation:
- Frontend production build, TypeScript and focused lint pass. Existing unrelated build warnings remain.
- Real pointer folder-name drop into Page 1; repeated drop did not duplicate it.
- Same folder added to Page 2, plus a note from its existing grip. All references and page selection survived reload.
- Folder moved within the navigator to Drag destination, reference path followed it, then folder restored to Navigator QA.
- Keyboard drag highlighted the page and completed with duplicate feedback.
- Unsaved draft blocked a drop, preserved the draft and left reference count unchanged; after discard the same folder dropped successfully.
- Referenced note opened in the editor; Write/Preview and inline Book Read worked.
- Cards and Panels, Light and Charcoal checked. Document and Book content overflow measured at 320, 390, 768, 1024 and 1600px (see responsive.json).
- Phone Add references successfully added a folder. Final 320px picker measured 282px client/scroll width, 242px choice client/scroll width and a 17px checkbox; screenshot inspected.
- Mobile exam question preview inspected as a static preview; no new exam attempt created in this batch.
- No browser console errors on the final local build. Two implementation/smoke cycles, with the second limited to the picker CSS correction and relevant rechecks.

Local QA fixture: Book drag QA, collection 8e2831fc-f134-4db9-bc6f-b296d23ea47c, org 10000000-0000-4000-8000-000000000028. Five placements across two pages; source parents unchanged after restoring the move test. Product content was not edited in production.

Evidence: folder-added.png, drop-highlight.png, cards-charcoal.png, book-mobile-charcoal.png, mobile-add-reference.png, mobile-question-preview.png and responsive.json. Backend/API contract unchanged; this is a frontend release. Physical touch-device dragging was not exercised; phone picker fallback was exercised.

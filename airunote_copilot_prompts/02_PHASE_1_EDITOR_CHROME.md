You are operating as a Principal Engineer and Systems Architect.

Implement Phase 1 only: Editor chrome and editing UX clarity for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/components/InlineCanvasDocumentCard.tsx
- frontend/components/airunote/lenses/CanvasLens.tsx
- and any tiny supporting utility/types only if clearly justified

GOAL
Make card editing understandable, clean, and clearly actionable.

REQUIREMENTS
1. Redesign inline edit mode so controls are no longer cramped or confusing.
2. Move primary editing actions to a clear top editor bar inside the card.
3. The top editor bar should prioritize:
   - document type
   - editing state
   - diff/dirty state
   - Save
   - Cancel
   - Focus / Open as secondary actions
4. Do not bury Save and Cancel at the very bottom as the primary control path.
5. Keep the editor body below the top editor bar and ensure it remains scrollable.
6. Preserve inline editing behavior for plain text, markdown, and RTF.
7. Preserve dirty-state tracking and diff markers.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

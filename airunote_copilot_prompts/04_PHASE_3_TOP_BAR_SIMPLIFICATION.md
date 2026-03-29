You are operating as a Principal Engineer and Systems Architect.

Implement Phase 3 only: Top bar simplification and hierarchy cleanup for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/_components/FolderCanvasTopOverlay.tsx
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx only if strictly necessary

GOAL
Reduce the “too many boxes / too many clusters” feel in the folder canvas top overlay.

REQUIREMENTS
1. Simplify the top overlay so it feels like one coherent control surface, not four mini dashboards.
2. Introduce a clearer hierarchy:
   - primary actions row
   - secondary status/warnings row
3. Reduce visual density and over-boxing where appropriate.
4. Keep these groups understandable:
   - Explore
   - Canvas
   - Notes
   - Layout
5. Preserve inset/safe-zone behavior exactly.
6. Preserve current actions and status meaning.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

You are operating as a Principal Engineer and Systems Architect.

Implement Phase 8 only: Final Lens menu intent cleanup for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/components/LensToolbar.tsx
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx

GOAL
Make all top-right lens menu actions feel real and intentional.

REQUIREMENTS
1. Confirm Edit Lens is truly wired and understandable.
2. If needed, improve naming, affordance, or follow-through so it is no longer confusing.
3. Preserve Set as default view and Delete Lens behavior.
4. Remove any dead/misleading feel from the menu.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

You are operating as a Principal Engineer and Systems Architect.

Implement Phase 4 only: Top-right lens switcher / menu polish for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/components/LensToolbar.tsx
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx only if strictly necessary

GOAL
Fix the top-right lens switcher so it no longer looks squished or awkward.

REQUIREMENTS
1. Improve the top-right active lens control so it reads like a real switcher, not a cramped square.
2. Give it better width, internal spacing, and text handling.
3. Keep the kebab menu aligned and visually balanced next to it.
4. Avoid awkward multiline squeeze unless it is intentionally designed.
5. Preserve the existing menu actions and current lens behavior.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

You are operating as a Principal Engineer and Systems Architect.

Implement Phase 7 only: Theme and preset perceptibility final pass for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/utils/canvasTheme.ts
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/_components/FolderCanvasTopOverlay.tsx only if strictly necessary

GOAL
Ensure themes and presets are not only technically working but visually obvious and meaningful.

REQUIREMENTS
1. Keep these as two layers:
   - Background theme:
     - Dark
     - Paper White
     - Textured Paper
     - Custom Color
   - Appearance preset:
     - Writer
     - Research
     - Study
     - Paper Desk
2. Ensure the user can clearly perceive what each theme changes.
3. Ensure each preset feels meaningfully different in note/card appearance.
4. Preserve per-note overrides as stronger than preset defaults.
5. Make the result feel intentional, not subtle to the point of confusion.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

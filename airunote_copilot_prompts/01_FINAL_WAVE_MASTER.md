You are operating as a Principal Engineer and Systems Architect.

Implement the final UX completion wave for the folder canvas page using phased execution.

IMPORTANT EXECUTION MODE
- Work in clearly separated phases.
- Complete each phase fully before moving to the next.
- Preserve current working behavior unless the phase explicitly changes it.
- Do not merge all fixes into one undifferentiated patch.
- Do not refactor unrelated areas.
- Keep all changes production-grade, minimal, and build-safe.
- Prefer targeted UX correction over broad rewrites.
- Output results phase by phase.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/components/InlineCanvasDocumentCard.tsx
- frontend/components/airunote/lenses/CanvasLens.tsx
- frontend/components/airunote/components/LensToolbar.tsx
- frontend/components/airunote/utils/canvasArrange.ts
- frontend/components/airunote/utils/canvasTheme.ts
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx
- frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/_components/FolderCanvasTopOverlay.tsx
- and any tiny supporting utility/types only if clearly justified

GOAL
Finish the remaining major UX problems in the folder canvas so this wave feels complete, coherent, and premium.

STRICT RULES
- Keep implementation minimal and production-grade
- Do not refactor unrelated areas
- Preserve all current working behaviors unless this phase explicitly improves that exact surface
- Preserve:
  - notes workflow
  - Save Notes / Cancel Notes
  - layout Save All / Discard
  - navigator
  - diff markers
  - theme persistence
  - preset persistence
  - per-note color overrides
  - PDF export
  - drag / resize
  - current build-passing state
- Do not change persistence domains unless explicitly required
- Do not introduce a giant new system
- Keep all changes compatible with current build-passing repo state
- Output full updated contents only for substantially changed files; otherwise provide exact patch-ready code sections with clear file paths and replacement boundaries

PHASE 1 — Editor chrome and editing UX clarity
Objective:
Make card editing understandable, clean, and clearly actionable.

Requirements:
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

PHASE 2 — Layout mode semantic rewrite
Objective:
Make Icon, Compact Grid, Preview, and Full feel clearly different and match their names.

Requirements:
1. Re-tune layout/card sizing semantics so:
   - Icon = truly small, quick-scan mode
   - Compact Grid = denser than standard, still readable
   - Preview = medium card with readable excerpt
   - Full = reading-first mode, clearly larger and calmer
2. Ensure these modes are visually distinct enough that the user immediately feels the difference.
3. Preserve arrange behavior and Save All / Discard layout staging.
4. Keep the preset system understandable and easy to tune later.
5. Use available canvas space intelligently without turning this into a heavy layout engine.

PHASE 3 — Top bar simplification and hierarchy cleanup
Objective:
Reduce the “too many boxes / too many clusters” feel in the folder canvas top overlay.

Requirements:
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

PHASE 4 — Top-right lens switcher / menu polish
Objective:
Fix the top-right lens switcher so it no longer looks squished or awkward.

Requirements:
1. Improve the top-right active lens control so it reads like a real switcher, not a cramped square.
2. Give it better width, internal spacing, and text handling.
3. Keep the kebab menu aligned and visually balanced next to it.
4. Avoid awkward multiline squeeze unless it is intentionally designed.
5. Preserve the existing menu actions and current lens behavior.

PHASE 5 — Free board pan / 2D canvas movement
Objective:
Make the canvas feel like a real board that can move naturally in both directions.

Requirements:
1. Ensure the board can free scroll / pan horizontally and vertically as needed.
2. Allow the canvas to feel less trapped and less artificially bounded.
3. If feasible cleanly, support drag-to-pan on empty canvas space without interfering with card drag.
4. Preserve card drag behavior and avoid gesture conflicts.
5. Keep navigator jump and focus behavior compatible.

PHASE 6 — Focus mode visual correctness
Objective:
Fix focus mode so the focused item remains crisp and dominant while the rest of the canvas is visually de-emphasized.

Requirements:
1. Background items may blur/dim.
2. The focused item itself must remain sharp, readable, and visually elevated.
3. Improve focus layering so the effect feels intentional and premium.
4. Preserve exit behavior and current focus workflow.

PHASE 7 — Theme and preset perceptibility final pass
Objective:
Ensure themes and presets are not only technically working but visually obvious and meaningful.

Requirements:
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

PHASE 8 — Final Lens menu intent cleanup
Objective:
Make all top-right lens menu actions feel real and intentional.

Requirements:
1. Confirm Edit Lens is truly wired and understandable.
2. If needed, improve naming, affordance, or follow-through so it is no longer confusing.
3. Preserve Set as default view and Delete Lens behavior.
4. Remove any dead/misleading feel from the menu.

OUTPUT FORMAT
For each phase, output:
1. Phase name
2. Architecture summary
3. Exact files changed
4. Patch-ready code changes
5. Why the phase cut is correct
6. What to test manually

FINAL RULE
Do not collapse everything into one giant unstructured response.
Complete the phases in order and keep each phase isolated, grounded, and build-safe.

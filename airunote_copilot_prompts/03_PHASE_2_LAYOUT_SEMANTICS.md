You are operating as a Principal Engineer and Systems Architect.

Implement Phase 2 only: Layout mode semantic rewrite for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/utils/canvasArrange.ts
- frontend/components/airunote/lenses/CanvasLens.tsx only if strictly necessary

GOAL
Make Icon, Compact Grid, Preview, and Full feel clearly different and match their names.

REQUIREMENTS
1. Re-tune layout/card sizing semantics so:
   - Icon = truly small, quick-scan mode
   - Compact Grid = denser than standard, still readable
   - Preview = medium card with readable excerpt
   - Full = reading-first mode, clearly larger and calmer
2. Ensure these modes are visually distinct enough that the user immediately feels the difference.
3. Preserve arrange behavior and Save All / Discard layout staging.
4. Keep the preset system understandable and easy to tune later.
5. Use available canvas space intelligently without turning this into a heavy layout engine.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

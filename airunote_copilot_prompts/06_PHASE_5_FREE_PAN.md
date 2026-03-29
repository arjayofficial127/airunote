You are operating as a Principal Engineer and Systems Architect.

Implement Phase 5 only: Free board pan / 2D canvas movement for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/lenses/CanvasLens.tsx

GOAL
Make the canvas feel like a real board that can move naturally in both directions.

REQUIREMENTS
1. Ensure the board can free scroll / pan horizontally and vertically as needed.
2. Allow the canvas to feel less trapped and less artificially bounded.
3. If feasible cleanly, support drag-to-pan on empty canvas space without interfering with card drag.
4. Preserve card drag behavior and avoid gesture conflicts.
5. Keep navigator jump and focus behavior compatible.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

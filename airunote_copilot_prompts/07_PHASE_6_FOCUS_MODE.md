You are operating as a Principal Engineer and Systems Architect.

Implement Phase 6 only: Focus mode visual correctness for the folder canvas page.

SCOPE
Only improve the minimum supporting code needed, likely within:
- frontend/components/airunote/lenses/CanvasLens.tsx
- frontend/components/airunote/components/InlineCanvasDocumentCard.tsx only if strictly necessary

GOAL
Fix focus mode so the focused item remains crisp and dominant while the rest of the canvas is visually de-emphasized.

REQUIREMENTS
1. Background items may blur/dim.
2. The focused item itself must remain sharp, readable, and visually elevated.
3. Improve focus layering so the effect feels intentional and premium.
4. Preserve exit behavior and current focus workflow.

OUTPUT FORMAT
1. Architecture summary
2. Exact files changed
3. Patch-ready code changes
4. Why this phase cut is correct
5. What to test manually

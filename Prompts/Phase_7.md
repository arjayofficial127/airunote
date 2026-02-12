MODE: CODE
MODE: HARDENING

PROJECT: Airunote
PHASE: 7 — Extraction Safety & Integrity Hardening

OBJECTIVE:
Guarantee Airunote can be extracted standalone.

CHECK:
- No direct shell imports
- No cross-app references
- All collections isolated
- All flags additive
- Strict org enforcement

Add integration tests for:
- org boundary violation
- root delete attempt
- share violation
- owner mismatch
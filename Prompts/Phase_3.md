MODE: CODE
MODE: DOMAIN-STRICT

PROJECT: Airunote
PHASE: 3 — Save-Before-Edit Enforcement

OBJECTIVE:
Enforce that documents cannot exist without explicit creation.

RULES:
- No auto-save
- No implicit create
- Document must be named + typed before editing
- No silent conversion

----------------------------------------------------
PART 1 — DRAFT MODEL (TEMPORARY, NON-PERSISTENT)
----------------------------------------------------

Introduce:
DocumentDraft type (in-memory only)

Fields:
- detectedType
- chosenType
- previewContent

----------------------------------------------------
PART 2 — DOMAIN ENFORCEMENT
----------------------------------------------------

Modify createUserDocument:

- Must require explicit type
- Must validate type in enum
- No defaulting
- No transformation

----------------------------------------------------
PART 3 — RTF PROTECTION
----------------------------------------------------

If type === RTF:
- Editing not allowed
- Return readOnly flag

----------------------------------------------------
OUTPUT:
Full files
Commit:
feat(airunote): enforce save-before-edit workflow
MODE: CODE
MODE: SECURITY-FIRST

PROJECT: Airunote
PHASE: 4 — Explicit Share Layer (Non-Cascading)

OBJECTIVE:
Allow explicit sharing of folder/document.

RULES:
- No cascade share
- Sharing does NOT imply ownership
- Owner remains owner
- Root cannot be shared
- Admin does NOT auto-read

----------------------------------------------------
PART 1 — SHARE TABLE
----------------------------------------------------

Create:
airunote_shares

Fields:
- id
- org_id
- target_type
- target_id
- granted_to_user_id
- created_at

Unique:
(org_id, target_type, target_id, granted_to_user_id)

----------------------------------------------------
PART 2 — REPOSITORY
----------------------------------------------------

Add:
- grantAccess(...)
- revokeAccess(...)
- checkAccess(...)

----------------------------------------------------
PART 3 — DOMAIN
----------------------------------------------------

Modify findDocument:
- owner OR share entry required

----------------------------------------------------
OUTPUT:
Full files
Commit:
feat(airunote): implement explicit non-cascading sharing
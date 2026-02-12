MODE: CODE
MODE: STRUCTURAL

PROJECT: Airunote
PHASE: 2 — Root Vault Provisioning & Idempotent Seeding

OBJECTIVE:
Guarantee deterministic private root creation per (orgId, ownerUserId).

CONSTITUTION:
- Exactly ONE root per user per org
- Root visibility = private only
- Root cannot be deleted
- Root cannot be shared
- Root cannot be renamed
- Root parent_folder_id = null
- Root humanId = system-controlled

----------------------------------------------------
PART 1 — REPOSITORY
----------------------------------------------------

ADD:

1) findUserRoot(orgId, ownerUserId)
2) createUserRoot(orgId, ownerUserId)
3) ensureUserRootExists(orgId, ownerUserId)

STRICT:
- Use UNIQUE index (org_id, owner_user_id, is_root=true)
- Idempotent logic
- Use transaction

----------------------------------------------------
PART 2 — DOMAIN SERVICE
----------------------------------------------------

ADD:

1) ensureVaultProvisioned(orgId, userId)

- Must call ensureUserRootExists
- Must be safe to call multiple times
- Must return root

----------------------------------------------------
PART 3 — PROTECTION RULES
----------------------------------------------------

Modify deleteFolder:
- If folder.is_root = true → throw explicit error

Modify renameFolder:
- If is_root → block

----------------------------------------------------
OUTPUT:
Print full updated files.
Conventional commit:
feat(airunote): implement deterministic user vault provisioning
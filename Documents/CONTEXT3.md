🧭 PHASE ROADMAP
🟦 Phase 1 — Folder & Document Core (Single-Owner Engine)

Goal:
Make Airunote usable for a single user vault inside org boundary.

Includes:

Folder CRUD

Document CRUD

Strict org boundary enforcement everywhere

No sharing yet

No admin bypass

Owner-only delete

Soft delete or hard delete decision

Parent/child tree validation

Prevent circular folder moves

Prevent cross-org folder reference

PermissionResolver stub integrated into read/write entry points

This is your “Private Vault Complete” milestone.

🟨 Phase 2 — Sharing Engine (Access Expansion Only)

Goal:
Access expands. Ownership never changes.

Includes:

Sharing table (airu_shares)

share_to_user

share_to_org

share_public

share_link (optional password hash)

View list vs Edit list

PermissionResolver implementation

Canonical vs Shared content split

Owner-only canonical control

Editors modify shared_content only

Owner accept/revert mechanism

Dead link behavior on deletion

No admin automatic access

This is your “Notion-Private-First Model” milestone.

🟧 Phase 3 — Deletion & Lifecycle Finalization

Goal:
Zero ambiguity in data lifecycle.

Includes:

User removed from org → hard delete vault

All shares collapse

All links dead

Clear UX contract

Explicit confirmation flows

No soft reactivation loopholes

No orphan folders

No cross-org leakage

Audit log for destructive events (optional)

This is your “Security > Convenience” milestone.

🟩 Phase 4 — Org-Scoped Collaborative Resources (Optional Extension)

This is different from sharing.

This is:

Org-owned canonical resources.

Includes:

Org-scoped folders (org-owned, not user-owned)

Multi-admin editor list

Creator field separate from owner

Admin governance rules

Org shared libraries

This is your “Hybrid Notion + Workspace Model.”

Optional. Not required for v1.

🟪 Phase 5 — History / Revision Engine (Optional Elite Layer)

Includes:

airu_document_revisions

version snapshots

restore previous version

revert shared changes

activity tracking

This is polish.
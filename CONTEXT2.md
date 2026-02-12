✅ Phase 0 — COMPLETE
====================

*   Root hierarchy (ORG ROOT → USER ROOT)
    
*   Idempotent provisioning
    
*   Ownership invariant (exactly one owner)
    
*   Org boundary enforced
    
*   No admin bypass
    
*   Hard delete lifecycle
    
*   DB invariants aligned with Constitution v1.0
    

Foundation is stable.

🚧 Phase 1 — Folder Tree Layer
==============================

This is structural CRUD only.

### 1\. Folder CRUD

*   Create folder under parent
    
*   Rename folder
    
*   Move folder
    
*   Soft delete folder (state-based, not DB delete)
    
*   Hard delete folder (owner-only)
    

### 2\. Tree Integrity Rules

*   Prevent cross-org moves
    
*   Prevent moving folder into its descendant
    
*   Prevent touching org root
    
*   Prevent touching user root
    

### 3\. Path Resolution

*   Fetch full folder tree for user
    
*   Breadcrumb resolver
    
*   Parent chain validation
    

No sharing yet.No documents yet.

Just vault integrity.

📄 Phase 2 — Document Lifecycle
===============================

Now files become real.

### 1\. Document CRUD

*   Create document
    
*   Rename
    
*   Move
    
*   Update content
    
*   Soft delete
    
*   Hard delete (owner only)
    

### 2\. Canonical / Shared Split (Your Elite Model)

Add:

*   canonical\_content
    
*   shared\_content (nullable)
    
*   revision table
    

Rules:

*   Owner edits canonical
    
*   Editors modify shared
    
*   Owner can accept shared → canonical
    
*   Owner can revert
    

This prevents silent destructive edits.

🔐 Phase 3 — Permission Engine
==============================

Implement PermissionResolver.

Access resolution order:

1.  Owner
    
2.  Explicit user share
    
3.  Org-wide share
    
4.  Public
    
5.  Link + password
    

Rules:

*   Sharing expands access, not ownership
    
*   Admin ≠ read access
    
*   Org owner ≠ file owner
    
*   Delete = owner only
    

This is the privacy-first core.

🗂 Phase 4 — Sharing Model
==========================

Implement:

*   Share to users
    
*   Share to org
    
*   Share public
    
*   Share via link (optional password)
    
*   View list
    
*   Edit list
    
*   No-delete list
    

Add sharing table.

Access-only.Never ownership mutation.

🧠 Phase 5 — Org-Scoped Collaborative Files (Optional V2)
=========================================================

You mentioned:

> org-scoped files editable by admins

This is separate from personal vaults.

This would be:

*   org-owned folders
    
*   collaborative mode
    
*   controlled by org policy
    

Important:Do NOT mix with user vault.

This is parallel branch.

🧹 Phase 6 — Membership Lifecycle Enforcement
=============================================

When:

*   User leaves org
    
*   Admin removes user
    

Then:

*   Hard delete entire user vault
    
*   All shared links collapse
    
*   All shares invalidated
    

UX must warn clearly.

Security > convenience.

📜 Phase 7 — Audit + History
============================

Add:

*   Revision history
    
*   Activity logs
    
*   Access logs
    
*   Restore from history
    

Optional but elite.

🧱 Architectural Order Recommendation
=====================================

You should go:

1️⃣ Phase 1 – Folder CRUD2️⃣ Phase 2 – Document CRUD3️⃣ Phase 3 – Permission engine4️⃣ Phase 4 – Sharing5️⃣ Phase 6 – Membership lifecycle enforcement6️⃣ Phase 7 – History7️⃣ Phase 5 – Org collaborative layer (if still needed)

Strategic Note
==============

Do NOT build sharing before document lifecycle is stable.

Do NOT build collaborative org mode before permission engine is hardened.

You are building a privacy-first architecture.Order matters.
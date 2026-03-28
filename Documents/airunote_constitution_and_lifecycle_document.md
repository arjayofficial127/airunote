📜 AIRUNOTE DATA OWNERSHIP & LIFECYCLE CONSTITUTION v1.0
========================================================

I. Fundamental Identity Model
-----------------------------

1.  Every document has exactly **one owner**.
    
2.  (org\_id, owner\_user\_id)
    
3.  Ownership cannot be implicitly transferred.
    
4.  Sharing never changes ownership.
    
5.  All access decisions resolve against immutable user\_id, not email, not display name.
    

II. Org as Boundary (Not Owner)
-------------------------------

1.  An org is a **security perimeter**, not a content owner.
    
2.  Admins manage:
    
    *   membership
        
    *   billing
        
    *   governance
        
3.  Admins do NOT automatically gain read access to private files.
    
4.  Org owner ≠ data owner.
    
5.  Multiple admins may exist; none inherit private vault access.
    

III. Vault Structure
--------------------

Hierarchy:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   [ORG ROOT]    └── [USER ROOT]            └── user folders   `

1.  Org root is structural only.
    
2.  User root represents the user's vault within that org.
    
3.  All personal documents live under the user root.
    
4.  User vaults are isolated from one another.
    

IV. Privacy Default
-------------------

1.  All files are private by default.
    
2.  Visibility must be explicitly expanded.
    
3.  No implicit org visibility.
    
4.  No implicit admin override.
    

V. Sharing Model (Access-Only)
------------------------------

Sharing expands access, not ownership.

### Supported Modes

*   Share to specific users
    
*   Share to org-wide
    
*   Share publicly
    
*   Share via link (with optional password)
    
*   Share by view list
    
*   Share by edit list
    

### Rules

1.  Sharing does not duplicate content.
    
2.  Sharing does not change ownership.
    
3.  If owner leaves and data is deleted, all shared access dies.
    
4.  Links resolve to resource existence — deleted resource = dead link.
    
5.  Recipients may manually copy content into their own vault.
    

VI. Canonical / Shared Split
----------------------------

Each document maintains:

*   canonical\_content (owner-controlled)
    
*   shared\_content (collaborator-edited)
    

Rules:

1.  Owner controls canonical.
    
2.  Editors modify shared.
    
3.  Owner can:
    
    *   accept shared into canonical
        
    *   revert shared to canonical
        
4.  Delete privilege remains owner-only.
    
5.  Editors cannot hard-delete.
    

This prevents sabotage via edit wipe.

VII. Removal & Deletion Lifecycle
---------------------------------

### When user leaves org (or is removed):

1.  User vault becomes immediately inaccessible.
    
2.  All owned documents are deleted.
    
3.  All shared links collapse.
    
4.  All access references become invalid.
    
5.  Re-adding same person creates new vault (new user\_id).
    

### Identity Integrity Rule

Re-adding user does not restore old data.This prevents:

*   impersonation
    
*   stale ownership conflicts
    
*   fake account resurrection
    

### UX Requirement (Mandatory Notice)

Before removal:

> “Removing this member permanently deletes their Airunote vault and all shared documents.”

Must be explicit.

VIII. Copy Safety Valve
-----------------------

If a user receives shared access:

*   They may manually duplicate the document into their own vault.
    
*   That copy becomes independently owned.
    
*   Owner deletion does not affect copied version.
    

Ownership never spreads implicitly.

IX. Public & Link Sharing
-------------------------

1.  Public or link sharing expands access scope.
    
2.  It does not change ownership.
    
3.  Deleting owner deletes public access.
    
4.  Link URLs must 404 after deletion.
    
5.  Password-protected links must be validated server-side only.
    

X. Future V2: Org-Scoped Documents (TO DO)
------------------------------------------

Separate category:

Org-scoped documents:

*   Owned by org (not individual)
    
*   Editable by admins
    
*   May assign editors
    
*   Admin can remove creator rights
    
*   Survive user departure
    

This is a different domain class.Must not mix with personal vault documents.

Implement later as separate table or ownership type.

XI. Invariants
--------------

These must never break:

1.  One document = one owner.
    
2.  Sharing ≠ ownership.
    
3.  Org ≠ owner of personal vaults.
    
4.  Admin ≠ reader of private files.
    
5.  Removal = destruction of owned vault.
    
6.  Copy = explicit duplication.
    
7.  Links die with resource.
# Folders, views and collections

Authorized via the side-chat relay after the Folders + / completion-switch release. Main chat owns implementation and release; no concurrent application writer found.

- Preserve folder/lens IDs and all original content/planning. Physical containers are Folders; overall environment is Workspace.
- Folder contents default to an icon Box with compact List/Details and Cards. Direct children by default, explicit descendants. Quiet view selector, + New, overflow; settings explicit.
- Add independently identified collections (Canvas, Book Pages, Study, curated Board). Use a separately tagged record in existing lens storage with organization/owner identity, a movable home, versioned settings and independent reference placements. Legacy lens endpoints must not edit these records. No destructive conversion or schema migration.
- Chosen membership stores references that survive source moves. Matching membership stores an explicit source/filter rule. Pages own order and placements; duplication copies arrangement and references only. Folder links can point to a collection without copying it.
- Reuse Canvas/Board rendering with collection-specific persistence. Book exposes ordered pages, multi-select cross-folder references, reorder and remove. Study selection stays collection-local. Original note editing remains shared.
- Workspace Plan/Calendar use original scheduling data across folders by default, with optional visible folder scope.
- Validate transactions, organization/owner/lifecycle boundaries, stale writes, move/duplicate/unlink/reload, 13 pages × 20 references from 1,000 cross-folder notes, direct-child counts and planning preservation. Browser smoke across themes/responsive widths plus exam editor/preview/actual question flow. Preserve recent pane/Freeze behavior.

## Subsequently authorized queue

Side-chat relay asks main to implement AJ as account popover (session full name/email, Edit profile, Switch workspace, Sign out), then sidebar cog for layout/panes/sizing/reset/theme/recovery/remaining overflow; remove redundant global toolbar after relocation while keeping Search and + New direct. Do after collection implementation/verification, preserve current task order and draft protections. Test account mutations/sign-out only in isolated QA. Reference images: /tmp/codex-clipboard-bf6ee5a6-a4b1-40c8-bc00-1f731ee29e3a.png, /tmp/codex-clipboard-a53ef082-fa43-4a70-b7dc-4c102f60ec9a.png, /tmp/codex-clipboard-f8fb9f5c-4e87-46a8-bc99-25d2b65f0155.png.

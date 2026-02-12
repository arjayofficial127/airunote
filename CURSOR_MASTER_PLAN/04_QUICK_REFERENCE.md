# 🚀 AIRUNOTE QUICK REFERENCE
## Execution Cheat Sheet

---

## 📋 PHASE STATUS

| Phase | Status | Priority | Dependencies |
|-------|--------|----------|--------------|
| Phase 0 | ✅ COMPLETE | - | - |
| Phase 1 | 🚧 PENDING | HIGH | Phase 0 |
| Phase 2 | ⏳ PENDING | HIGH | Phase 1 |
| Phase 3 | ⏳ PENDING | HIGH | Phase 2 |
| Phase 4 | ⏳ OPTIONAL | LOW | Phase 3 |
| Phase 5 | ⏳ OPTIONAL | LOW | Phase 2 |

---

## 🎯 CONSTITUTION INVARIANTS (NEVER BREAK)

1. ✅ One document = one owner
2. ✅ Sharing ≠ ownership
3. ✅ Org ≠ owner of personal vaults
4. ✅ Admin ≠ reader of private files
5. ✅ Removal = destruction of owned vault
6. ✅ Copy = explicit duplication
7. ✅ Links die with resource

---

## 🏗️ CURRENT ARCHITECTURE

### Files Structure
```
backend-node/src/modules/airunote/
├── airunote.repository.ts          ✅ Complete
├── airunote.domainService.ts        ✅ Complete
├── airunote.internal.routes.ts      ✅ Complete
└── airunote.permissions.ts          🚧 Scaffold only
```

### Database Tables
```
✅ airu_folders
✅ airu_documents
✅ airu_user_roots
✅ airu_shortcuts
⏳ airu_shares (Phase 2)
⏳ airu_document_revisions (Phase 2)
⏳ airu_audit_logs (Phase 3)
```

---

## 📝 EXECUTION COMMANDS

### Phase 1 Execution
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 1 - Folder & Document Core
[See: 01_PHASE_1_DETAILED.md]
```

### Phase 2 Execution
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 2 - Sharing Engine
[See: 02_PHASE_2_DETAILED.md]
```

### Phase 3 Execution
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 3 - Lifecycle Finalization
[See: 03_PHASE_3_DETAILED.md]
```

---

## 🔍 KEY VALIDATION POINTS

### Every Operation Must:
- ✅ Verify `orgId` matches
- ✅ Verify `ownerUserId` matches (for owner operations)
- ✅ Check PermissionResolver (for shared resources)
- ✅ Enforce org boundary
- ✅ Prevent admin bypass

### Root Protection:
- ❌ Cannot delete org root
- ❌ Cannot delete user root
- ❌ Cannot rename org root
- ❌ Cannot rename user root
- ❌ Cannot move org root
- ❌ Cannot move user root

### Sharing Rules:
- ❌ Cannot share org root
- ❌ Cannot share user root
- ✅ Only owner can share
- ✅ Only owner can delete
- ✅ Editors can modify shared_content only

---

## 🚨 COMMON PITFALLS TO AVOID

1. **Admin Bypass** - Never grant automatic access based on admin status
2. **Cross-Org Leakage** - Always validate org_id in queries
3. **Nested Transactions** - Use transaction parameter, don't nest
4. **Orphaned Data** - Cascade deletes properly
5. **Cycle Creation** - Always validate parent chain before move
6. **Ownership Mutation** - Sharing never changes ownership
7. **Soft Delete Loopholes** - Hard delete on user removal

---

## 📊 SUCCESS METRICS

### Phase 1 Success
- User can manage vault independently
- No cross-org access possible
- Folder tree operations work
- Document CRUD operations work

### Phase 2 Success
- All sharing modes work
- PermissionResolver enforces access correctly
- Canonical/shared split prevents destructive edits
- Admin cannot access private files

### Phase 3 Success
- Vault deletion works correctly
- All shares collapse
- All links invalidate
- Audit trail exists

---

## 🔗 RELATED DOCUMENTS

- **Constitution:** `airunote_constitution_and_lifecycle_document.md`
- **Current State:** `CONTEXT1.md`
- **Phase Breakdown:** `CONTEXT2.md`
- **Roadmap:** `CONTEXT3.md`
- **Phase Prompts:** `Prompts/Phase_*.md`

---

**Last Updated:** 2024

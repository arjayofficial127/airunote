# 🚀 EXECUTION STRATEGY
## How Many Runs? One Giant or Multiple?

---

## 📊 SCOPE ANALYSIS

### Current File Sizes
- `airunote.repository.ts`: **278 lines** (Phase 0 complete)
- `airunote.domainService.ts`: **209 lines** (Phase 0 complete)
- `airunote.internal.routes.ts`: **~100 lines** (1 route)

### Phase 1 Scope (Estimated)
- **Repository:** +14 methods (~400-500 lines)
- **Domain Service:** +12 methods (~300-400 lines)
- **Internal Routes:** +9 endpoints (~200-300 lines)
- **Total Phase 1:** ~900-1200 lines of new code

### Phase 2 Scope (Estimated)
- **Schema Migrations:** 3 new tables (~200 lines SQL)
- **Repository:** +8 methods (~300-400 lines)
- **PermissionResolver:** Full implementation (~200-300 lines)
- **Domain Service:** +8 methods (~300-400 lines)
- **Total Phase 2:** ~1000-1300 lines

### Phase 3 Scope (Estimated)
- **Schema Migration:** 1 new table (~50 lines SQL)
- **Repository:** +4 methods (~150-200 lines)
- **Domain Service:** +3 methods (~200-300 lines)
- **Total Phase 3:** ~400-550 lines

---

## 🎯 RECOMMENDED APPROACH: **MULTIPLE RUNS**

### Why Multiple Runs?

1. **.cursorrules Compliance**
   - "One intent per change"
   - "Changes must be minimal and scoped"
   - File size limits: Services ≤ 400 lines
   - Current domainService is 209 lines, Phase 1 adds ~400 → **~609 lines** (exceeds limit)

2. **Testing & Validation**
   - Each phase builds on previous
   - Need to test incrementally
   - Catch issues early

3. **Risk Management**
   - Smaller changes = easier to review
   - Easier to rollback if needed
   - Less chance of breaking existing code

4. **Dependency Management**
   - Phase 2 depends on Phase 1
   - Phase 3 depends on Phase 2
   - Can't skip ahead safely

---

## 📋 RECOMMENDED EXECUTION PLAN

### Option A: **Phase-by-Phase** (RECOMMENDED)

**Run 1: Phase 1 - Folder & Document Core**
- Repository extensions (folder + document methods)
- Domain service extensions
- Internal routes
- **Estimated:** 1-2 hours
- **Files Modified:** 3 files
- **New Code:** ~900-1200 lines

**Run 2: Phase 2 - Sharing Engine**
- Schema migrations
- PermissionResolver implementation
- Sharing operations
- Canonical/shared split
- **Estimated:** 2-3 hours
- **Files Modified:** 4 files + migrations
- **New Code:** ~1000-1300 lines

**Run 3: Phase 3 - Lifecycle Finalization**
- Vault deletion
- Share collapse
- Link invalidation
- Audit logging
- **Estimated:** 1-2 hours
- **Files Modified:** 3 files + migration
- **New Code:** ~400-550 lines

**Total:** 3 runs, 4-7 hours total

---

### Option B: **Sub-Phase Breakdown** (SAFER)

If Phase 1 feels too large, break it down:

**Run 1A: Folder CRUD (Repository + Domain)**
- Repository: 7 folder methods
- Domain Service: 5 folder methods
- **Estimated:** 30-45 min
- **Files Modified:** 2 files

**Run 1B: Document CRUD (Repository + Domain)**
- Repository: 7 document methods
- Domain Service: 7 document methods
- **Estimated:** 30-45 min
- **Files Modified:** 2 files

**Run 1C: Internal Routes**
- 9 new endpoints
- **Estimated:** 20-30 min
- **Files Modified:** 1 file

**Total Phase 1:** 3 runs, ~1.5-2 hours

---

### Option C: **One Giant Run** (NOT RECOMMENDED)

**Why NOT:**
- ❌ Violates .cursorrules file size limits
- ❌ Too much code to review at once
- ❌ Higher risk of errors
- ❌ Harder to test incrementally
- ❌ Difficult to rollback
- ❌ May hit token limits

**If you insist:**
- Would need to split files (e.g., `airunote.repository.folders.ts`, `airunote.repository.documents.ts`)
- Still risky
- Not recommended

---

## ✅ RECOMMENDED STRATEGY: **Option A (Phase-by-Phase)**

### Execution Commands

**Run 1: Phase 1**
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 1 - Folder & Document Core
[Reference: CURSOR_MASTER_PLAN/01_PHASE_1_DETAILED.md]
```

**Run 2: Phase 2**
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 2 - Sharing Engine
[Reference: CURSOR_MASTER_PLAN/02_PHASE_2_DETAILED.md]
```

**Run 3: Phase 3**
```
MODE: CODE
MODE: EFFICIENT

TASK: Implement Phase 3 - Lifecycle Finalization
[Reference: CURSOR_MASTER_PLAN/03_PHASE_3_DETAILED.md]
```

---

## 🎯 FINAL ANSWER

**How many runs?** **3 runs** (one per phase)

**Can it be 1 giant run?** **Technically yes, but NOT recommended**

**Why?**
- File size limits (domainService would exceed 400 lines)
- Testing & validation needs
- Risk management
- .cursorrules compliance

**Best approach:** Execute Phase 1, test it, then move to Phase 2, test it, then Phase 3.

---

## 📝 NOTES

- Each phase is self-contained and testable
- Can pause between phases for testing
- Can adjust approach based on Phase 1 results
- Follows .cursorrules discipline
- Maintains code quality standards

---

**Ready to start?** Say: **"Execute Phase 1"**

# 🔍 PRODUCTION BUILD ISSUES REPORT
## Next.js Build Failure Analysis - Airunote Frontend

**Generated:** 2024  
**Scope:** All files that would cause `npm run build` to fail  
**Focus:** Type safety, route params, React hooks, server/client boundaries

---

## 📋 SUMMARY

**Total Issues Found:** 12  
**Critical (Build Blocking):** 8  
**Warnings (Type Safety):** 4

---

## 🚨 CRITICAL ISSUES (Build Blocking)

### 1. **Missing `useRouter` Import**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx`  
**Line:** 369  
**Issue:** `router` is used but not imported  
**Error Type:** ReferenceError  
**Why It Fails:** `router.push()` is called but `router` is undefined

```typescript
// Line 369: router.push(`/orgs/${orgIdFromParams}/airunote`);
// But useRouter is not imported
```

**Fix:**
```typescript
import { useParams, useRouter } from 'next/navigation'; // Add useRouter

export default function FolderViewPage() {
  const params = useParams();
  const router = useRouter(); // Add this line
  // ... rest of code
}
```

---

### 2. **Route Params Type Assertion Without Guard**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/page.tsx`  
**Line:** 26  
**Issue:** `params.orgId` is `string | string[] | undefined` but asserted as `string` without guard  
**Error Type:** TypeScript strict mode error  
**Why It Fails:** In production build, TypeScript strict mode catches unsafe type assertions

```typescript
const orgIdFromParams = params.orgId as string; // ❌ Unsafe
```

**Fix:**
```typescript
const orgIdFromParams = typeof params.orgId === 'string' ? params.orgId : null;
// Or guard before use:
if (typeof params.orgId !== 'string') {
  return <ErrorState title="Invalid route" message="Organization ID is required" />;
}
const orgIdFromParams = params.orgId;
```

---

### 3. **Route Params Type Assertion Without Guard**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx`  
**Lines:** 31-32  
**Issue:** Both `folderId` and `orgId` asserted without guards  
**Error Type:** TypeScript strict mode error

```typescript
const folderId = params.folderId as string; // ❌ Unsafe
const orgIdFromParams = params.orgId as string; // ❌ Unsafe
```

**Fix:**
```typescript
const folderId = typeof params.folderId === 'string' ? params.folderId : null;
const orgIdFromParams = typeof params.orgId === 'string' ? params.orgId : null;

if (!folderId || !orgIdFromParams) {
  return <ErrorState title="Invalid route" message="Folder ID and Organization ID are required" />;
}
```

---

### 4. **Route Params Type Assertion Without Guard**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/document/[documentId]/page.tsx`  
**Lines:** 25-26  
**Issue:** Both `documentId` and `orgId` asserted without guards  
**Error Type:** TypeScript strict mode error

```typescript
const documentId = params.documentId as string; // ❌ Unsafe
const orgIdFromParams = params.orgId as string; // ❌ Unsafe
```

**Fix:**
```typescript
const documentId = typeof params.documentId === 'string' ? params.documentId : null;
const orgIdFromParams = typeof params.orgId === 'string' ? params.orgId : null;

if (!documentId || !orgIdFromParams) {
  return <ErrorState title="Invalid route" message="Document ID and Organization ID are required" />;
}
```

---

### 5. **Route Params Type Assertion Without Guard**
**File:** `frontend/components/airunote/components/FolderTree.tsx`  
**Line:** 20  
**Issue:** `params.orgId` asserted without guard  
**Error Type:** TypeScript strict mode error

```typescript
const orgIdFromParams = params.orgId as string; // ❌ Unsafe
```

**Fix:**
```typescript
const orgIdFromParams = typeof params.orgId === 'string' ? params.orgId : '';
// Or handle undefined case:
if (typeof params.orgId !== 'string') {
  return null; // Or error state
}
const orgIdFromParams = params.orgId;
```

---

### 6. **Route Params Type Assertion Without Guard**
**File:** `frontend/components/airunote/components/DocumentList.tsx`  
**Line:** 19  
**Issue:** `params.orgId` asserted without guard  
**Error Type:** TypeScript strict mode error

```typescript
const orgIdFromParams = params.orgId as string; // ❌ Unsafe
```

**Fix:**
```typescript
const orgIdFromParams = typeof params.orgId === 'string' ? params.orgId : '';
// Or handle undefined case
```

---

### 7. **Missing useEffect Dependency**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/page.tsx`  
**Line:** 69  
**Issue:** `useEffect` missing `orgIdFromParams` in dependency array  
**Error Type:** React exhaustive-deps warning (fails in strict mode)  
**Why It Fails:** ESLint rule `react-hooks/exhaustive-deps` in strict mode

```typescript
useEffect(() => {
  // ... uses orgIdFromParams indirectly via airunoteApi.provision
}, [isLoading, error, tree, orgId, userId, actualRootFolderId]); // ❌ Missing orgIdFromParams
```

**Fix:**
```typescript
useEffect(() => {
  // ... code
}, [isLoading, error, tree, orgId, userId, actualRootFolderId, orgIdFromParams]);
```

**Note:** Actually, `orgIdFromParams` is only used in error state, so this might be acceptable. But if `orgIdFromParams` changes, the effect should re-run.

---

### 8. **Missing useEffect Dependency**
**File:** `frontend/components/airunote/components/PasteDock.tsx`  
**Line:** 78  
**Issue:** `useEffect` missing `defaultFolderId` in dependency array  
**Error Type:** React exhaustive-deps warning

```typescript
useEffect(() => {
  if (!documentName && pastedContent.trim()) {
    // ...
  }
}, [pastedContent, documentName]); // ❌ Missing defaultFolderId (used in setSelectedFolderId)
```

**Fix:**
```typescript
useEffect(() => {
  // ... code
}, [pastedContent, documentName, defaultFolderId]);
```

---

## ⚠️ TYPE SAFETY WARNINGS (May Fail in Strict Mode)

### 9. **Implicit `any` in Error Handling**
**File:** `frontend/components/airunote/components/PasteDock.tsx`  
**Line:** 134  
**Issue:** `err` is implicitly `any`  
**Error Type:** TypeScript `noImplicitAny` error

```typescript
} catch (err) { // ❌ Implicit any
  setError(err instanceof Error ? err.message : 'Failed to create document');
}
```

**Fix:**
```typescript
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'Failed to create document');
}
```

---

### 10. **Potential `undefined` in String Template**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx`  
**Line:** 88  
**Issue:** `folderId` could be `undefined` when passed to component  
**Error Type:** TypeScript strict null check

```typescript
{rootTree ? <FolderTree tree={rootTree} currentFolderId={folderId} orgId={orgId} /> : <FolderTreeSkeleton />}
// folderId is string | undefined, but FolderTree expects string | undefined, so this is OK
// But if FolderTree expects string, this fails
```

**Check:** Verify `FolderTreeProps.currentFolderId` type. If it's `string`, this fails.

**Fix (if needed):**
```typescript
{rootTree ? <FolderTree tree={rootTree} currentFolderId={folderId || undefined} orgId={orgId} /> : <FolderTreeSkeleton />}
```

---

### 11. **Potential `undefined` in Hook Call**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/document/[documentId]/page.tsx`  
**Line:** 39  
**Issue:** `documentId` could be `undefined` when passed to hook  
**Error Type:** TypeScript strict null check

```typescript
const { data: document, isLoading, error } = useAirunoteDocument(orgId, userId, documentId);
// documentId is string | undefined, but hook expects string | null
```

**Check:** `useAirunoteDocument` signature accepts `string | null`, so this should be OK. But verify the type matches.

**Fix (if needed):**
```typescript
const { data: document, isLoading, error } = useAirunoteDocument(orgId, userId, documentId || null);
```

---

### 12. **Potential `undefined` in Hook Call**
**File:** `frontend/app/(dashboard)/orgs/[orgId]/airunote/folder/[folderId]/page.tsx`  
**Line:** 53  
**Issue:** `folderId` could be `undefined` when passed to hook  
**Error Type:** TypeScript strict null check

```typescript
const { data: tree, isLoading, error } = useAirunoteTree(orgId, userId, folderId);
// folderId is string | undefined, but hook expects string | undefined, so this is OK
```

**Check:** `useAirunoteTree` signature accepts `string | undefined` for `parentFolderId`, so this should be OK.

---

## 🔍 ADDITIONAL CHECKS NEEDED

### Missing Return Type Annotations
**Files to Check:**
- All exported functions in `frontend/components/airunote/hooks/*.ts`
- All exported functions in `frontend/components/airunote/components/*.tsx`

**Issue:** Next.js production build may require explicit return types for exported functions in strict mode.

**Example:**
```typescript
// Current (may fail):
export function useAirunoteTree(...) {
  return useQuery<...>({...});
}

// Should be:
export function useAirunoteTree(...): ReturnType<typeof useQuery<...>> {
  return useQuery<...>({...});
}
```

---

### Server/Client Boundary Issues
**Status:** ✅ All Airunote components correctly marked with `'use client'`

**Verified Files:**
- All `*.tsx` files in `frontend/components/airunote/components/`
- All page files in `frontend/app/(dashboard)/orgs/[orgId]/airunote/`

---

### Node.js API Usage
**Status:** ✅ No Node.js APIs detected in Airunote components

**Verified:** No `fs`, `path`, `crypto` (Node), `process.env` (server-only) usage in client components.

---

## 📝 RECOMMENDED FIX ORDER

1. **Fix Missing Import** (Issue #1) - Blocks build immediately
2. **Fix Route Params Guards** (Issues #2-6) - Type safety critical
3. **Fix useEffect Dependencies** (Issues #7-8) - React strict mode
4. **Fix Implicit Any** (Issue #9) - TypeScript strict mode
5. **Verify Hook Type Compatibility** (Issues #10-12) - Verify types match

---

## ✅ VALIDATION CHECKLIST

After fixes, verify:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes (if configured)
- [ ] TypeScript compilation succeeds (`tsc --noEmit`)
- [ ] All route params are properly guarded
- [ ] All hooks have correct dependency arrays
- [ ] No implicit `any` types
- [ ] All exported functions have return types (if required by config)

---

## 🎯 PRIORITY

**P0 (Must Fix):**
- Issue #1 (Missing router import)
- Issues #2-6 (Route params guards)

**P1 (Should Fix):**
- Issues #7-8 (useEffect dependencies)
- Issue #9 (Implicit any)

**P2 (Verify):**
- Issues #10-12 (Type compatibility checks)

---

**End of Report**

PROMPT START

We are entering ENTERPRISE PRODUCTION BUILD STABILIZATION MODE.

Objective:
Make `npm run build` pass with ZERO errors.
Runtime behavior must remain 100% unchanged.

This is a surgical stabilization pass — NOT a refactor.

------------------------------------------------------------
SCOPE
------------------------------------------------------------
Only modify files inside the `frontend` directory unless
the build error explicitly originates elsewhere.

------------------------------------------------------------
🔒 HARD CONSTRAINTS (NON-NEGOTIABLE)
------------------------------------------------------------

1. DO NOT refactor architecture.
2. DO NOT change runtime behavior.
3. DO NOT rename functions, variables, or files.
4. DO NOT restructure components.
5. DO NOT introduce new abstractions.
6. DO NOT remove existing logic.
7. DO NOT weaken TypeScript strictness.
8. DO NOT use `any`.
9. DO NOT use non-null assertion (`!`) unless mathematically safe.
10. DO NOT modify tsconfig.json, next.config.js, package.json.
11. DO NOT disable ESLint rules.
12. DO NOT modify files that are not directly causing a build error.
13. Fix errors strictly in the order the compiler reports them.
14. Do NOT pre-fix predicted errors. Only fix actual build failures.
15. Do NOT reformat entire files. Modify only exact necessary lines.
16. Do NOT modify comments unless directly tied to the fix.
17. If a fix risks altering logic flow, STOP and explain before proceeding.
18. Do NOT apply automatic formatting or stylistic changes beyond the exact lines required.
19. If three consecutive attempts fail to resolve the same error, STOP and provide diagnostic analysis instead of broadening changes.
20. Do NOT introduce fallback logic, default values, defensive guards, or environment-based behavior changes unless strictly required to resolve the compiler error.
21. Do NOT modify environment variable usage or introduce new environment reads.
22. Do NOT introduce temporary workarounds or TODO-based patches.

------------------------------------------------------------
🔁 PROCESS LOOP (MANDATORY)
------------------------------------------------------------

1. Run `npm run build`.
2. Capture the FIRST error in output.
3. Identify the ROOT CAUSE.
4. Apply the minimal surgical fix.
5. Re-run `npm run build`.
6. Repeat until build completes successfully.
7. After build succeeds:
   - Run `tsc --noEmit`
   - Run `npm run lint` (if available)

Only stop when:

BUILD COMPLETES WITHOUT ERRORS.

------------------------------------------------------------
✅ ALLOWED FIX TYPES
------------------------------------------------------------

- Safe route param narrowing
- Adding missing imports
- Converting `undefined` → `null` via `?? null`
- Adding type guards (`if (!param) return ...`)
- Correcting hook parameter types if mismatched
- Fixing strict null check issues properly
- Adding explicit return types if required
- Correcting React hook dependency arrays ONLY if build-blocking

------------------------------------------------------------
❌ FORBIDDEN FIX TYPES
------------------------------------------------------------

- Adding `as any`
- Using `!` to silence type errors
- Editing configuration files
- Changing dependency versions
- Removing ESLint rules
- Refactoring code style
- Reformatting unrelated code
- Adding new libraries
- Introducing TODO comments as placeholders
- Adding fallback behavior changes

------------------------------------------------------------
📋 REPORTING FORMAT (REQUIRED AFTER EACH FIX)
------------------------------------------------------------

For every change:

1. File path
2. Line number(s)
3. Original code snippet
4. Updated code snippet
5. Exact compiler error message
6. Explanation of root cause
7. Why this fix preserves behavior

------------------------------------------------------------
🏁 FINAL CONFIRMATION
------------------------------------------------------------

When build succeeds, output exactly:

BUILD CLEAN — PRODUCTION SAFE — BEHAVIOR PRESERVED

Then list:

- All files changed
- Total number of fixes
- Confirmation no configuration files were modified
- Confirmation no runtime logic was altered

Begin now.

PROMPT END
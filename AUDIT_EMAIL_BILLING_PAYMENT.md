# Email Verification, Billing, and Payment Infrastructure Audit

**Date:** 2025-01-XX  
**Scope:** Backend and Frontend codebase  
**Purpose:** Assess current state for email verification, plan/subscription model, and Stripe integration

---

## AUTH / EMAIL

### 1. Is there any email sending infrastructure?
**Answer: NO**

**Evidence:**
- No email service found in `backend-node/src/infrastructure/services/`
- Services directory contains: `DateTimeService.ts`, `NoOpFileStorageService.ts`, `PasswordHasherService.ts`, `R2FileStorageService.ts`, `StorageBackendFactory.ts`, `SupabaseFileStorageService.ts`, `TokenService.ts`, `VercelService.ts`
- No `EmailService.ts`, `MailService.ts`, or similar
- No `nodemailer`, `sendgrid`, `resend`, or other email packages in `backend-node/package.json`
- No email-related environment variables in `backend-node/.env copy.example`

**File References:**
- `backend-node/src/infrastructure/services/` (directory listing)
- `backend-node/package.json` (lines 19-39, dependencies list)

---

### 2. Is there any verification token system?
**Answer: NO**

**Evidence:**
- No verification token fields in User table schema
- No verification token generation/validation logic found
- `TokenService.ts` only handles JWT access/refresh tokens, not email verification tokens

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33, usersTable definition)
- `backend-node/src/infrastructure/services/TokenService.ts` (JWT tokens only)

---

### 3. Does User table contain emailVerified flag?
**Answer: NO**

**Evidence:**
- User table schema in `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33) contains:
  - `id`, `email`, `passwordHash`, `name`, `isActive`, `defaultOrgId`, `createdAt`
  - No `emailVerified` or `email_verified` column

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33)
- `backend-node/src/domain/entities/User.ts` (lines 4-14, User entity definition)
- `backend-node/drizzle/0000_umpisa.sql` (lines 252-261, users table creation)

---

### 4. Does User table contain verificationToken?
**Answer: NO**

**Evidence:**
- No `verificationToken` or `verification_token` column in users table
- No verification token storage found

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33)
- `backend-node/drizzle/0000_umpisa.sql` (lines 252-261)

---

### 5. Does User table contain verificationExpiry?
**Answer: NO**

**Evidence:**
- No `verificationExpiry` or `verification_expiry` column in users table

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33)
- `backend-node/drizzle/0000_umpisa.sql` (lines 252-261)

---

### 6. Is there resend verification endpoint?
**Answer: NO**

**Evidence:**
- No `/auth/resend-verification` or similar endpoint in `backend-node/src/api/routes/auth.routes.ts`
- Auth routes only contain: `/register`, `/login`, `/refresh`, `/logout`, `/me`, `/me/full`
- No verification-related endpoints found

**File References:**
- `backend-node/src/api/routes/auth.routes.ts` (lines 18-400, all routes listed)

---

### 7. Is login currently blocked for unverified users?
**Answer: NO**

**Evidence:**
- `AuthUseCase.login()` in `backend-node/src/application/use-cases/AuthUseCase.ts` (lines 87-121) only checks:
  - User exists
  - User is active (`isActive`)
  - Password is valid
- No email verification check in login flow
- No `emailVerified` field to check even if it existed

**File References:**
- `backend-node/src/application/use-cases/AuthUseCase.ts` (lines 87-121, login method)

---

## BILLING / PLAN

### 8. Does Org or User have planType column?
**Answer: NO**

**Evidence:**
- Org table schema in `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 47-56) contains:
  - `id`, `name`, `slug`, `description`, `isActive`, `createdAt`
  - No `planType`, `plan_type`, or plan-related columns
- User table has no plan-related columns

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (lines 22-33, usersTable; lines 47-56, orgsTable)

---

### 9. Does database contain subscription-related tables?
**Answer: NO**

**Evidence:**
- No tables with names containing "subscription", "billing", "plan", "payment", or "stripe" in schema
- Schema contains: `users`, `orgs`, `roles`, `org_users`, `org_user_roles`, `posts`, `collections`, `airu_folders`, `airu_documents`, etc.
- No subscription tracking tables

**File References:**
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (full file, all table definitions)
- `backend-node/drizzle/0000_umpisa.sql` (all CREATE TABLE statements)

---

### 10. Is there any usage tracking (document count, storage count)?
**Answer: PARTIAL (Limited)**

**Evidence:**
- **Document count:** No explicit usage tracking table
- **Storage count:** No storage quota tracking
- **Post count:** Limited - `PostRepository.countByOrgIdAndAuthor()` exists (line 175) and is used to enforce 3-post limit per user in `PostUseCase.create()` (lines 56-62)
- **Join code usage:** `join_codes.used_count` tracks join code usage (line 301 in schema.ts)
- **No Airunote usage tracking:** No tracking of Airunote document/folder counts for billing purposes

**File References:**
- `backend-node/src/infrastructure/persistence/PostRepository.ts` (line 175, `countByOrgIdAndAuthor`)
- `backend-node/src/application/use-cases/PostUseCase.ts` (lines 56-62, 3-post limit check)
- `backend-node/src/infrastructure/db/drizzle/schema.ts` (line 301, `join_codes.used_count`)

---

### 11. Is there middleware that checks subscription status?
**Answer: NO**

**Evidence:**
- Middleware directory contains: `authMiddleware.ts`, `rateLimitMiddleware.ts`, `requireOrgMembership.ts`, `requireOrgRole.ts`, `uploadRateLimitMiddleware.ts`
- No subscription/plan checking middleware found
- No `requireSubscription.ts`, `checkPlan.ts`, or similar

**File References:**
- `backend-node/src/api/middleware/` (directory listing)
- `backend-node/src/api/middleware/requireOrgMembership.ts` (org membership only)
- `backend-node/src/api/middleware/requireOrgRole.ts` (role-based only)

---

### 12. Are any features gated by plan currently?
**Answer: NO**

**Evidence:**
- No plan-based feature gating found in routes or use cases
- Only role-based gating exists (`requireOrgRole` middleware)
- Post creation has a hardcoded 3-post limit per user (not plan-based)

**File References:**
- `backend-node/src/application/use-cases/PostUseCase.ts` (lines 56-62, hardcoded 3-post limit)
- `backend-node/src/api/middleware/requireOrgRole.ts` (role-based access control)

---

## PAYMENT

### 13. Is Stripe already installed?
**Answer: NO**

**Evidence:**
- `backend-node/package.json` (lines 19-39) does not contain `stripe` package
- No Stripe-related imports found in codebase

**File References:**
- `backend-node/package.json` (lines 19-39, dependencies list)

---

### 14. Are there webhook handlers?
**Answer: NO**

**Evidence:**
- No webhook routes found in `backend-node/src/api/routes/`
- No webhook handlers in `backend-node/src/api/server.ts`
- No Stripe webhook endpoint patterns found

**File References:**
- `backend-node/src/api/server.ts` (lines 221-233, all route registrations)
- `backend-node/src/api/routes/` (directory listing)

---

### 15. Is there any billing service module?
**Answer: NO**

**Evidence:**
- No billing service in `backend-node/src/infrastructure/services/`
- No billing use case in `backend-node/src/application/use-cases/`
- No billing repository or interfaces

**File References:**
- `backend-node/src/infrastructure/services/` (directory listing)
- `backend-node/src/application/use-cases/` (no billing-related files)

---

### 16. Is there environment config for Stripe keys?
**Answer: NO**

**Evidence:**
- `backend-node/.env copy.example` contains:
  - `DATABASE_URL`, `JWT_*`, `API_PORT`, `NODE_ENV`, `REGISTRATION_SECRET`, `FRONTEND_URL`
  - No `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, or similar

**File References:**
- `backend-node/.env copy.example` (full file, lines 1-18)

---

## FRONTEND

### 17. Is there UI for billing page?
**Answer: NO**

**Evidence:**
- No billing page in `frontend/app/(dashboard)/orgs/[orgId]/`
- Directory contains: `airunote/`, `collections/`, `dashboard/`, `members/`, `posts/`, `records/`, `settings/`
- No `billing/` or `subscription/` directory

**File References:**
- `frontend/app/(dashboard)/orgs/[orgId]/` (directory listing)

---

### 18. Is there subscription status displayed anywhere?
**Answer: NO**

**Evidence:**
- No subscription status UI components found
- No plan type display in org settings or user profile
- No subscription badges or indicators

**File References:**
- `frontend/app/(dashboard)/orgs/[orgId]/settings/page.tsx` (no subscription info)
- `frontend/components/user/UserProfileModal.tsx` (if exists, no subscription display)

---

### 19. Is there upgrade button flow?
**Answer: NO**

**Evidence:**
- No upgrade buttons found in UI
- No upgrade flow or checkout pages
- No Stripe Checkout integration

**File References:**
- No upgrade-related files found

---

### 20. Is there verification email screen?
**Answer: NO**

**Evidence:**
- No verification email page in `frontend/app/(auth)/` or `frontend/app/(dashboard)/`
- No "Please verify your email" UI components
- No verification success/failure pages

**File References:**
- `frontend/app/(dashboard)/` (directory listing)
- `frontend/app/(auth)/` (if exists, no verification pages)

---

### 21. Is there route guard for subscription enforcement?
**Answer: NO**

**Evidence:**
- Route guards only check authentication and org membership
- `OrgAccessChecker.tsx` checks org access only
- No subscription/plan-based route guards

**File References:**
- `frontend/components/org/OrgAccessChecker.tsx` (org membership only)
- `frontend/app/(dashboard)/layout.tsx` (auth checks only)

---

## SUMMARY

### Email Verification: **NOT IMPLEMENTED**
- No email infrastructure
- No verification fields in User table
- No verification endpoints
- No login blocking for unverified users

### Billing/Plan: **NOT IMPLEMENTED**
- No plan type columns
- No subscription tables
- No usage tracking (except hardcoded 3-post limit)
- No subscription middleware
- No plan-based feature gating

### Payment: **NOT IMPLEMENTED**
- Stripe not installed
- No webhook handlers
- No billing service
- No Stripe environment config

### Frontend: **NOT IMPLEMENTED**
- No billing UI
- No subscription status display
- No upgrade flow
- No verification email screen
- No subscription route guards

---

## RECOMMENDATIONS

All features (email verification, plan model, subscription gating, Stripe integration) need to be implemented from scratch.

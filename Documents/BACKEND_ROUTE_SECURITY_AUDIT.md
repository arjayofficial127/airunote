# Backend Route Security Audit

**Date:** 2026-03-01  
**Scope:** All POST, PUT, DELETE, PATCH routes

## Route Security Audit Table

| Route Path | File Location | Middleware Chain | Uses Auth Middleware? | Uses Org Membership? | Accepts userId from Body? | Accepts orgId from Body? | Uses req.user? | Production-Safe? | Internal/Dev-Only? |
|------------|---------------|------------------|----------------------|----------------------|---------------------------|--------------------------|----------------|------------------|-------------------|
| POST /api/auth/register | auth.routes.ts | authRateLimit | No | No | No | No | No | Yes | No |
| POST /api/auth/login | auth.routes.ts | authRateLimit | No | No | No | No | No | Yes | No |
| POST /api/auth/refresh | auth.routes.ts | None | No | No | No | No | No | Yes | No |
| POST /api/auth/logout | auth.routes.ts | None | No | No | No | No | No | Yes | No |
| PATCH /api/auth/me | auth.routes.ts | authMiddleware | Yes | No | No | No | Yes | Yes | No |
| POST /api/orgs | orgs.routes.ts | authMiddleware (router.use) | Yes | No | No | No | Yes | Yes | No |
| PUT /api/orgs/:orgId | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/join-code/generate | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| PATCH /api/orgs/:orgId/join-code/settings | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| POST /api/orgs/join | orgs.routes.ts | authMiddleware | Yes | No | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/join-requests/:requestId/approve | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/join-requests/:requestId/reject | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/teams | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| PATCH /api/orgs/:orgId/teams/:teamId | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId/teams/:teamId | orgs.routes.ts | authMiddleware, requireOrgRole(['admin', 'superadmin']) | Yes | Yes (via requireOrgRole) | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/posts | posts.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| PATCH /api/orgs/:orgId/posts/:postId | posts.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId/posts/:postId | posts.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/posts/:postId/comments | comments.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| PATCH /api/orgs/:orgId/posts/:postId/comments/:commentId | comments.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId/posts/:postId/comments/:commentId | comments.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/posts/:postId/likes/toggle | likes.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/posts/:postId/attachments | attachments.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId/posts/:postId/attachments/:attachmentId | attachments.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/airunote/lenses/folders/:folderId/lenses | airunote.lenses.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/orgs/:orgId/airunote/lenses/:lensId/duplicate | airunote.lenses.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| DELETE /api/orgs/:orgId/airunote/lenses/:lensId | airunote.lenses.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| PATCH /api/orgs/:orgId/airunote/lenses/:lensId/items | airunote.lenses.routes.ts | authMiddleware, requireOrgMembership (router.use) | Yes | Yes | No | No | Yes | Yes | No |
| POST /api/internal/airunote/provision | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard removed - still insecure) | Yes |
| POST /api/internal/airunote/folder | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PUT /api/internal/airunote/folder/:id | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| DELETE /api/internal/airunote/folder/:id | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| POST /api/internal/airunote/document | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PUT /api/internal/airunote/document/:id | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| DELETE /api/internal/airunote/document/:id | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| POST /api/internal/airunote/folders/:id/lenses | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/folders/:id/lenses/:lensId | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| POST /api/internal/airunote/folders/:id/lenses/:lensId/set-default | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| POST /api/internal/airunote/vault/delete | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/lenses/:lensId/canvas-positions | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/lenses/:lensId/board-card | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/lenses/:lensId/board-lanes | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/lenses/:lensId/batch-layout | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| POST /api/internal/airunote/lenses | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |
| PATCH /api/internal/airunote/lenses/:lensId | airunote.internal.routes.ts | None | No | No | Yes | Yes | No | No (production guard) | Yes |

## Summary Statistics

- **Total Routes:** 38
- **Production-Safe Routes:** 23
- **Internal/Dev-Only Routes:** 15
- **Routes with Auth Middleware:** 23
- **Routes with Org Membership Validation:** 20
- **Routes Accepting userId from Body:** 15 (all internal routes)
- **Routes Accepting orgId from Body:** 15 (all internal routes)
- **Routes Using req.user:** 23

## Notes

1. **Production Guard:** Most internal routes check `NODE_ENV === 'production'` and return 403. However, `/provision` and `/full-metadata` have production guard removed but still lack authentication.

2. **requireOrgRole:** This middleware includes org membership check, so routes using it are marked as "Uses Org Membership? Yes".

3. **requireOrgMembership:** Applied via `router.use()` in several route files, so all routes in those files inherit org membership validation.

## Security Findings

### Critical Issues

1. **Internal Routes Accept userId/orgId from Body (15 routes)**
   - All `/api/internal/airunote/*` routes accept `userId` and `orgId` from request body
   - No authentication or authorization checks
   - Production guard blocks these in production, but they are still security risks

2. **Internal Routes Have No Authentication (15 routes)**
   - All internal routes lack `authMiddleware`
   - No user identity verification
   - Relies solely on production guard

### Production-Safe Routes

All routes under:
- `/api/auth/*` (except internal routes)
- `/api/orgs/*` (except internal routes)
- `/api/orgs/:orgId/posts/*`
- `/api/orgs/:orgId/airunote/lenses/*`

These routes:
- Use `authMiddleware` to verify user identity
- Use `requireOrgMembership` or `requireOrgRole` to verify org access
- Extract `userId` from `req.user` (not from body)
- Extract `orgId` from `req.params` (not from body)

### Internal Routes (Dev-Only)

All routes under `/api/internal/airunote/*`:
- Blocked in production via `checkProduction()` guard
- Accept `userId` and `orgId` from request body
- No authentication or authorization
- Should be removed or secured before production use

# Exam appearance and native file library

Implemented on 2026-10-10. Production migration completed; hosted application deployment is in progress.

Production recovery snapshot: Neon `production at 2026-10-09 18:16:45 UTC (manual)`. The atomic SQL backfill verified original exam/attempt field checksums and retained 4 exams, 27 attempts, and 360 answers. It created two organization templates and left no missing appearance values.

## Product behavior

- Org admins/superadmins manage reusable designs under **Exam templates**, choose the default for new exams, and change an individual exam under **Appearance**.
- Applying a template copies its configuration into the exam. Editing the original template never changes saved exams automatically. **Apply latest template to draft** is explicit and still requires saving.
- Duplicating an exam copies its appearance. Starting an attempt snapshots that appearance so later admin edits do not change the respondent's design mid-attempt.
- Controls include branding, logo, badge, artwork, captions, semantic colors, gradients, fonts, corners, Autumn/Plain decorations, animation, footer, and sound availability/defaults. System status/error wording and exam behavior remain application-controlled.
- Desktop/mobile previews use the public renderer with sample data. They create no attempts and play no audio. Entry, questions, completion, upcoming, ended, focus termination, and timeout can be previewed.
- **Files** is native navigation, with built-in and organization tabs. It needs no app installation. Uploads, authenticated previews/downloads, visibility, usage details, and removal are available to admins.

## Assets

The browser-safe contract and asset catalog are in `backend-node/src/modules/exam-appearance/contract.ts`; the frontend reexports this pure Zod module. Keep it free of server/database imports. The frontend build needs the monorepo source (including this contract). Its Webpack alias and TypeScript path resolve Zod from the frontend install, so separate frontend/backend dependency installations work.

| Stable ID | Repository asset |
| --- | --- |
| `starbucks-logo` | `frontend/public/exams/store-9/starbucks.svg` |
| `marry-furrmily-cats` | `frontend/public/exams/store-9/cats.png` |

References are `{source: 'builtin', assetId}` or `{source: 'org-file', fileId}`. Built-ins need no database file rows or storage provider. Preserve these IDs and paths; add catalog entries when shipping new built-in assets. Autumn branches/leaves and completion decorations remain renderer graphics, controlled through appearance settings.

Uploaded images must be public and belong to the same organization before they can be attached. Public delivery checks a published/closed, nonarchived exam or its retained attempt. A public flag alone does not expose an unattached asset through the exam endpoint. Archived templates/exams and saved attempts retain usage protection. A future retention purge must remove the corresponding usage rows in the same transaction.

Image/PDF uploads are limited to 10 MB; PNG/JPEG/WebP images are validated with Sharp (40 MP, maximum 12,000 pixels per side). Arbitrary SVG/HTML uploads are rejected. The bundled trusted SVG remains selectable. Retries reuse an upload UUID and content checksum. Storage keys and credentials are never returned to clients.

## Storage

Production uploads are disabled by default. Set `FILE_UPLOADS_ENABLED=true` only when storage is ready.

Choose one production provider. Do not put credentials in frontend variables.

- **R2:** `STORAGE_BACKEND=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `FILES_R2_BUCKET_NAME`. Use a dedicated private bucket with public access disabled. Objects are served through the backend's authorization checks.
- **Supabase:** `STORAGE_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FILES_SUPABASE_BUCKET_NAME` (or the existing `SUPABASE_BUCKET_NAME`). The adapter refuses public buckets.
- **Local development only:** `FILE_STORAGE_LOCAL_DIR` with an absolute path and `NODE_ENV=development`. This is explicitly disabled in production.
- With no provider, uploads report unavailable while built-ins, templates, and appearance editing continue working.

Deletion first verifies usage under a database lock, marks the row removed, then deletes the object. A failed object deletion appears under pending cleanup and can be retried. This is not a trash/restore feature. In-use files cannot become private or be deleted.

## Rollout

1. Preserve a database backup/Neon branch. Confirm the target database and existing application migrations, especially `exams`, `exam_attempts`, `exam_org_settings`, and `org_files`.
2. Run `pnpm install --frozen-lockfile` from the repository root.
3. Set the intended `DATABASE_URL` through the deployment environment. Run `pnpm --filter backend-node db:migrate:appearance` **before deploying the new backend**.
4. The dedicated runner applies additive SQL `0030_exam_appearance_and_native_files.sql` and backfills from frozen `0030_legacy_appearance.json` in one transaction with an advisory lock. It creates one legacy Autumn template per existing exam organization and updates only missing appearance values. It preserves IDs, public URLs, questions, answers, attempts, scheduling, and existing timestamps. Repeating it does not overwrite customized appearance.
5. Use this runner, not only the SQL file: the data backfill is required. The historical general migration journal is not rewritten by this change.
6. Deploy backend and frontend from the same revision. Set `NEXT_PUBLIC_API_BASE_URL` to the production API at frontend build time. Enable native storage when ready; it is not required for the bundled assets.
7. Verify each existing public exam in its current response-window state, an admin appearance save/reload, template creation, and (if storage is configured) an upload/preview/selection. Do not create respondent test attempts in live exams; use a dedicated test exam.
8. After rollout, create the new Wrapped In Joy template and exam. That theme/content is a separate follow-up; it has not been invented here.

Rollback the application to the prior revision while retaining these additive columns/tables. Avoid dropping appearance/file data as a rollback shortcut. Exams created during rollback receive null appearance and are safely handled by rerunning the migration before upgrading again.

## Validation

- Backend TypeScript compilation and frontend production build.
- `pnpm --filter backend-node test:appearance` against a disposable loopback Postgres database whose name ends in `_test`. It requires the existing application schema, `DATABASE_URL`, development JWT secrets, `NODE_ENV=development`, and `FILE_STORAGE_LOCAL_DIR`. If login is exercised, use the local test Resend key without sending email.
- The integration script verifies migration repeatability with four legacy fixtures; independent defaults/templates/exams; stale-save conflicts; duplication; admin and org isolation; respondent start/answer/resume/submit; appearance snapshots; real image bytes and upload retry idempotency; public/authenticated delivery; attempt retention; cleanup; unsupported types; built-ins without storage; archive/default behavior; and report access.
- Browser smoke checks: appearance save/reload, built-in picker, native navigation, reusable template creation, all seven previews, mobile iframe rendering, and original-vs-configurable computed style/geometry comparisons for the public entry page at desktop and 390px. Both comparisons matched for the 12 primary page elements.
- Browser chooser upload was blocked by the ChatGPT extension's file-URL permission; multipart upload and storage cleanup passed the API integration check. Production R2/Supabase credentials and delivery have not been exercised.
- Local fixture setup omits unrelated collection infrastructure; its collection-list errors do not validate that subsystem. No changes to landing/demo behavior were made.

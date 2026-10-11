# Graded previews

The exam editor's **Public preview code** action generates an eight-digit code and a `/exam/coded-preview?exam=...` link. Only the code hash is stored. Generating another code invalidates the previous code and its grants for new starts; disabling code access also blocks new starts. Existing attempts remain resumable and retained. Codes are never included in URLs.

A successful code check issues an exam-scoped, 12-hour signed grant. Code entry is rate limited (10 requests per 15 minutes per IP); legitimate preview attempts have no lifetime attempt limit. The page loads exam content only after successful code validation. Draft and closed status are treated as published for preview access; response windows, required identity, required answers, grading, question order, per-question and overall timing, and focus protection still apply.

Both preview types use the same saved-answer and grading pipeline as respondents. Reports show **Attempts** and **PreviewAttempts** separately. Preview rows are labeled **Admin Attempt** or **Preview Coded** (`previewedByRole=PreviewCoded`, `isPreview=true`). Existing admin-preview records keep their classification. Respondent metrics, exports and answer matrix exclude previews. No attempt history is removed.

Admin previews require a signed-in examiner account. An incognito session without authentication should use coded preview access instead.

## Deployment

Before deploying the backend, apply `backend-node/drizzle/0031_exam_preview_codes.sql` to the intended database. The dedicated runner requires an explicit `DATABASE_URL`:

```sh
cd backend-node
npx tsx scripts/migrate-exam-preview-codes.ts
```

Set `JWT_SECRET` on the backend. The migration is additive and idempotent. Deploy the backend and frontend together. Code access remains disabled until an authorized editor generates a code. Existing preview attempts and their grades remain available.

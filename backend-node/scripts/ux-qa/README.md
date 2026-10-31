# Isolated local UX review

This runs the real frontend and API with disposable PostgreSQL data. It does not import account content or change existing environment files. PostgreSQL binds only to loopback; the fixture script refuses every database except `127.0.0.1:55434/airunote_ux_review`. Login email delivery is disabled and uploads use the existing no-op storage service.

Prerequisites: installed workspace dependencies, Node 20+, pnpm, Docker, and the `postgres:16-alpine` image.

From the repository root:

```bash
bash backend-node/scripts/ux-qa/run-local.sh setup
bash backend-node/scripts/ux-qa/run-local.sh backend
# In a second terminal:
bash backend-node/scripts/ux-qa/run-local.sh frontend
```

For the built local preview, stop the development frontend first, then run:

```bash
bash backend-node/scripts/ux-qa/run-local.sh build
bash backend-node/scripts/ux-qa/run-local.sh preview
```

Keep the local backend running in its separate terminal. Both frontend modes use port 4320 and the same local API; run one frontend mode at a time. The build and development server share Next.js output, so stop either frontend server before rebuilding.

Open `http://localhost:4320/login`. Disposable credentials are `review@airunote.local` / `AirunoteLocal28!`. These are sample-only credentials, unrelated to any existing account.

The local organization ID is `10000000-0000-4000-8000-000000000028`. Its Home route is `/orgs/10000000-0000-4000-8000-000000000028/airunote`. The Book folder is `30000000-0000-4000-8000-000000000002`; root is `30000000-0000-4000-8000-000000000001`; the SAGEX sample document is `40000000-0000-4000-8000-000000000002`.

Fixtures include nested folders, planned and unplanned notes, repeated Canvas labels, and two exams: an editable draft and a published two-question participant sample. Open `http://localhost:4320/exam/local-ux-participant` to test normal participant entry, choice and date questions, submission, and review. All changes and attempts remain in the local fixture database. Seeding is additive and idempotent; rerunning it preserves edits made during review.

The same container exposes a separate empty `book_test` database through port 54329 for the existing destructive integration suite. It is separate from the review data:

```bash
cd backend-node
BOOK_TEST_DATABASE_URL=postgres://postgres:airunote_local_review@127.0.0.1:54329/book_test \
  pnpm test -- --runInBand tests/unit/book-contract.spec.ts tests/integration/book.integration.test.ts
```

Use Ctrl+C in each application terminal to stop it. To stop the disposable database while retaining local review edits, run `docker stop airunote-ux-review-20261028`.

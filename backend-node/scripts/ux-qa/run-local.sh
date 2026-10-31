#!/usr/bin/env bash
set -euo pipefail

# Fixed disposable targets. Existing .env files remain untouched.
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
task_container=airunote-ux-review-20261028
task_database=postgres://postgres:airunote_local_review@127.0.0.1:55434/airunote_ux_review

case "${1:-help}" in
  setup)
    if docker container inspect "$task_container" >/dev/null 2>&1; then
      docker start "$task_container" >/dev/null
    else
      docker run -d --name "$task_container" \
        -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=airunote_local_review \
        -e POSTGRES_DB=airunote_ux_review \
        -p 127.0.0.1:55434:5432 -p 127.0.0.1:54329:5432 postgres:16-alpine >/dev/null
    fi
    for task_attempt in {1..30}; do
      if docker exec "$task_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
      sleep 1
    done
    cd "$task_root/backend-node"
    DATABASE_URL="$task_database" pnpm exec drizzle-kit push:pg --config drizzle.config.ts
    node scripts/ux-qa/seed-local.cjs
    if [[ "$(docker exec "$task_container" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='book_test'")" != 1 ]]; then
      docker exec "$task_container" createdb -U postgres book_test
    fi
    ;;
  backend)
    cd "$task_root/backend-node"
    exec env DATABASE_URL="$task_database" \
      JWT_ACCESS_SECRET=airunote-local-review-access-only \
      JWT_REFRESH_SECRET=airunote-local-review-refresh-only JWT_ACCESS_EXPIRES_IN=12h \
      IS_EMAIL_LOGIN=false RESEND_API_KEY=re_local_review_unused STORAGE_BACKEND=noop \
      PORT=4321 API_PORT=4321 FRONTEND_URL=http://localhost:4320 \
      ALLOWED_DOMAINS=localhost,127.0.0.1 NODE_ENV=development pnpm exec tsx src/index.ts
    ;;
  frontend)
    cd "$task_root/frontend"
    exec env NEXT_PUBLIC_API_BASE_URL=http://localhost:4321/api pnpm dev --port 4320 --hostname 127.0.0.1
    ;;
  build)
    cd "$task_root/frontend"
    exec env NEXT_PUBLIC_API_BASE_URL=http://localhost:4321/api pnpm build
    ;;
  preview)
    cd "$task_root/frontend"
    exec env NEXT_PUBLIC_API_BASE_URL=http://localhost:4321/api pnpm start --port 4320 --hostname 127.0.0.1
    ;;
  *)
    echo 'Usage: backend-node/scripts/ux-qa/run-local.sh setup|backend|frontend|build|preview'
    echo 'Run setup once, then backend and frontend in separate terminals.'
    ;;
esac

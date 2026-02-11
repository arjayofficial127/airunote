# AtomicFuel Backend Engine

A minimal, multi-org, extensible backend engine. Generic, fork-ready, and product-agnostic.

## Overview

AtomicFuel provides:

- **Multi-organization** support
- **Authentication & authorization** (JWT, cookies, role-based access)
- **Org-scoped content primitives** (posts, comments, likes, attachments)
- **Generic collections & records** (schema-agnostic data engine)
- **Internal file storage** (R2, Supabase, or no-op)
- **Notifications, teams, memberships** (org collaboration features)

## Architecture

- **Core**: DI container, Result pattern, error handling, logging
- **Domain**: Entities, value objects, domain events
- **Application**: Use cases, DTOs, repository interfaces
- **Infrastructure**: Drizzle repositories, services (JWT, password hashing)
- **API**: Express routes, middleware, error handling

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `FRONTEND_URL` - Frontend origin for CORS (default: http://localhost:3000)
- `ALLOWED_DOMAINS` - Comma-separated list of additional allowed domains for CORS
- `JWT_SECRET` - Secret for JWT token signing
- `REGISTRATION_SECRET` - Secret for user registration
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name (optional)
- `SUPABASE_BUCKET_NAME` - Supabase bucket name (optional)

## API Endpoints

### Auth
- `POST /api/auth/register?secret=...` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/orgs` - List user's organizations
- `POST /api/orgs` - Create organization
- `GET /api/orgs/:orgId` - Get organization details

### Posts
- `GET /api/orgs/:orgId/posts` - List posts
- `POST /api/orgs/:orgId/posts` - Create post
- `GET /api/orgs/:orgId/posts/:postId` - Get post
- `PATCH /api/orgs/:orgId/posts/:postId` - Update post
- `DELETE /api/orgs/:orgId/posts/:postId` - Delete post

### Comments
- `GET /api/orgs/:orgId/posts/:postId/comments` - List comments
- `POST /api/orgs/:orgId/posts/:postId/comments` - Create comment

### Likes
- `POST /api/orgs/:orgId/posts/:postId/likes/toggle` - Toggle like
- `GET /api/orgs/:orgId/posts/:postId/likes/count` - Get like count
- `GET /api/orgs/:orgId/posts/:postId/likes/me` - Check if user liked

### Collections & Records
- `GET /api/orgs/:orgId/collections` - List collections
- `POST /api/orgs/:orgId/collections` - Create collection
- `GET /api/orgs/:orgId/collections/:collectionId/records` - List records
- `POST /api/orgs/:orgId/collections/:collectionId/records` - Create record

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Deployment

Build and run with Docker:

```bash
docker build -t atomicfuel-backend .
docker run -p 4000:4000 --env-file .env atomicfuel-backend
```

Or deploy to any Node.js host with the provided Dockerfile.

## License

Copyright (c) 2024 Arvin Jayson Tamayo Castro
# AtomicFuel Frontend

Next.js 14 App Router frontend for AtomicFuel - a minimal, multi-organization workspace engine with posts, collections, and offline-first capabilities.

## Setup 

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with NEXT_PUBLIC_API_BASE_URL
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

The app will be available at `http://localhost:3000`.

## Features

- **Multi-organization workspace**: Create and manage multiple organizations
- **Posts**: Create, edit, and manage posts with comments and likes
- **Collections**: Organize content with flexible collections
- **Members**: Manage team members and permissions
- **Offline-first**: Works offline with local caching and optimistic updates
- **Responsive design**: Built with Tailwind CSS

## Deployment

Deploy to Vercel:

1. Connect your repository to Vercel
2. Set `NEXT_PUBLIC_API_BASE_URL` environment variable
3. Deploy

The app is configured for Vercel's Next.js deployment.

Trigger Upload Username
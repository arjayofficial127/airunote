# Vercel Integration Setup

## Overview
After a domain is verified via DNS TXT record, the system automatically adds it to Vercel and displays DNS instructions for the user.

## Environment Variables Required

Add these to your `.env` file (or Render environment variables):

```bash
VERCEL_API_TOKEN=your_vercel_api_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

## How to Get Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it (e.g., "BaseOfUI Domain Manager")
4. Copy the token
5. Add to `VERCEL_API_TOKEN` in your `.env`

## How to Get Vercel Project ID

1. Go to your Vercel project dashboard
2. Go to Settings → General
3. Find "Project ID" (or check the URL: `vercel.com/[team]/[project]`)
4. Copy the Project ID
5. Add to `VERCEL_PROJECT_ID` in your `.env`

## How It Works

1. **User adds domain** → Stored in database with `is_verified = false`
2. **User adds DNS TXT record** → `_baseofui.{domain}` with verification token
3. **User clicks "Verify Domain"** → Backend checks DNS TXT record
4. **If verified** → Backend automatically:
   - Adds `{domain}` to Vercel
   - Adds `www.{domain}` to Vercel
   - Gets DNS configuration from Vercel
   - Returns DNS records to frontend
5. **Frontend displays** → DNS instructions (A/CNAME records) for user to add in GoDaddy
6. **User adds DNS records** → Domain goes live!

## Features

- ✅ Automatic Vercel domain addition (base + www)
- ✅ DNS instructions displayed in UI
- ✅ Non-blocking: If Vercel fails, verification still succeeds
- ✅ Graceful degradation: Works even if Vercel not configured

## Testing

1. Set environment variables
2. Add a domain in UI
3. Add DNS TXT record in GoDaddy
4. Click "Verify Domain"
5. Check backend logs for Vercel API calls
6. Check UI for DNS instructions

## API Endpoints Used

- `POST /v10/projects/{projectId}/domains` - Add domain
- `GET /v10/projects/{projectId}/domains/{domain}/config` - Get DNS config

## Notes

- Vercel integration is optional - if not configured, verification still works
- If domain already exists in Vercel (409), it's treated as success
- DNS records are fetched from Vercel and shown to user
- User must still manually add A/CNAME records in GoDaddy

# AiruNote Authentication Implementation Review

## Executive Summary

**Current Authentication Method:** Bearer Token (JWT) - **Bearer-Only MVP**

- **Backend:** Expects `Authorization: Bearer <token>` header on all protected routes
- **Frontend:** Stores token in-memory (module variable), attaches to all API requests
- **No Cookies:** All cookie-based authentication has been removed
- **No Proxy:** Direct backend communication (no Next.js API route proxy)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Authentication Flow](#authentication-flow)
5. [Local vs Production Differences](#local-vs-production-differences)
6. [Token Storage & Transmission](#token-storage--transmission)
7. [Known Issues & Debugging](#known-issues--debugging)
8. [Environment Variables](#environment-variables)

---

## Architecture Overview

### Authentication Type: **Bearer Token (JWT)**

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       │ 1. POST /auth/login { email, password }
       │
       ▼
┌─────────────┐
│   Backend   │
│  (Express)  │
└──────┬──────┘
       │
       │ 2. Returns { user, accessToken }
       │
       ▼
┌─────────────┐
│   Frontend  │
│             │
│ Stores token│
│ in memory   │
└──────┬──────┘
       │
       │ 3. All subsequent requests:
       │    Authorization: Bearer <token>
       │
       ▼
┌─────────────┐
│   Backend   │
│             │
│ Validates   │
│ token       │
└─────────────┘
```

### Key Characteristics

- ✅ **Bearer Token Only** - No cookies, no session storage
- ✅ **In-Memory Storage** - Token stored in module variable (lost on page refresh)
- ✅ **Direct Backend Calls** - No proxy layer
- ✅ **Simple Error Handling** - 401 → Clear token → Redirect to login
- ❌ **No Token Refresh** - Refresh endpoint disabled for MVP
- ❌ **No Persistence** - Token lost on page refresh (in-memory only)

---

## Backend Implementation

### Location: `backend-node/src/api/middleware/authMiddleware.ts`

```typescript
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header only
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const tokenService = container.resolve<ITokenService>(TYPES.ITokenService);
    const payload = tokenService.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
```

### Key Points:

1. **Token Extraction:**
   - Only reads from `req.headers.authorization`
   - Removes `'Bearer '` prefix
   - **NO cookie reading** (`req.cookies` not used)

2. **Error Handling:**
   - Missing token → `UnauthorizedError: No token provided`
   - Invalid/expired token → `UnauthorizedError: Invalid or expired token`

3. **User Context:**
   - Sets `req.user` with `userId` and `email`
   - Available to all route handlers after middleware

### Login Endpoint: `backend-node/src/api/routes/auth.routes.ts`

```typescript
router.post('/login', authRateLimit, async (req: Request, res: Response, next) => {
  try {
    const input = LoginDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);
    const result = await authUseCase.login(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const { user, accessToken } = result.unwrap();

    // ... email sending logic (non-blocking) ...

    res.json({
      success: true,
      data: {
        user,
        accessToken,  // ✅ Token returned in JSON response
      },
    });
  } catch (error) {
    next(error);
  }
});
```

### Key Points:

1. **Response Format:**
   ```json
   {
     "success": true,
     "data": {
       "user": { "id": "...", "email": "...", "name": "..." },
       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ```

2. **NO Cookies Set:**
   - No `res.cookie()` calls
   - Token only in JSON response body

3. **Register Endpoint:**
   - Same format as login
   - Returns `{ user, accessToken }`

### Protected Routes

All protected routes use `authMiddleware`:

```typescript
// Example: backend-node/src/api/routes/orgs.routes.ts
import { authMiddleware } from '../middleware/authMiddleware';

router.use(authMiddleware);  // All routes in this router require auth
```

**Protected Routes:**
- `/api/orgs/*`
- `/api/dashboard/*`
- `/api/internal/airunote/*` (some endpoints)
- `/api/auth/me`
- `/api/auth/me/full`
- `/api/auth/me` (PATCH)

**Public Routes:**
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/health`

---

## Frontend Implementation

### Token Storage: `frontend/lib/api/token.ts`

```typescript
let accessToken: string | null = null;

export const tokenStorage = {
  getToken: (): string | null => {
    return accessToken;
  },

  setToken: (token: string): void => {
    accessToken = token;
  },

  clearToken: (): void => {
    accessToken = null;
  },
};
```

**Critical Issue:** Token is stored in a **module variable**, which means:
- ✅ Persists during the same browser session (same page)
- ❌ **Lost on page refresh** (module reloads, variable resets)
- ❌ **Lost on navigation** (if Next.js does full page reload)
- ❌ **Lost on new tab** (separate module instance)

### API Client: `frontend/lib/api/client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { tokenStorage } from './token';

// Direct backend URL (no proxy)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clearToken();
      
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isAuthPage = pathname === '/login' || pathname === '/register';
        
        if (!isAuthPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
```

### Key Points:

1. **Base URL:**
   - Local: `http://localhost:4000/api` (default)
   - Production: `process.env.NEXT_PUBLIC_API_BASE_URL` (must be set)

2. **Request Interceptor:**
   - Gets token from `tokenStorage`
   - Attaches `Authorization: Bearer <token>` header
   - **If no token, header is not set** (request will fail with 401)

3. **Response Interceptor:**
   - On 401: Clears token → Redirects to login
   - Simple, no retry logic

### Auth API: `frontend/lib/api/auth.ts`

```typescript
export const authApi = {
  login: async (input: LoginInput) => {
    const response = await apiClient.post('/auth/login', input);
    const data = response.data;
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);  // ✅ Store token
    }
    
    return data;
  },

  register: async (input: RegisterInput, secret: string) => {
    const response = await apiClient.post(`/auth/register?secret=${secret}`, input);
    const data = response.data;
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);  // ✅ Store token
    }
    
    return data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    tokenStorage.clearToken();  // ✅ Clear token first
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore errors - token is already cleared
    }
  },
};
```

### Login Page: `frontend/app/(auth)/login/page.tsx`

```typescript
const onSubmit = async (data: LoginInput) => {
  setLoading(true);
  setError(null);

  try {
    await authApi.login(data);  // ✅ Token stored automatically
    router.push('/dashboard');   // ✅ Redirect after login
  } catch (err: any) {
    setError(err.response?.data?.error?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

### Auth Session Provider: `frontend/providers/AuthSessionProvider.tsx`

```typescript
const checkAuth = useCallback(async () => {
  // ...
  try {
    setStatus('loading');
    const res = await authApi.getMe();  // ✅ Uses apiClient with token
    
    const userData = res?.data || null;
    if (userData && (userData.id || userData.email)) {
      setUser(userData);
      setStatus('ready');
    } else {
      setUser(null);
      setStatus('ready');
    }
  } catch (err: any) {
    const statusCode = err.response?.status;
    
    if (statusCode === 401 || statusCode === 403) {
      setUser(null);
      setStatus('ready');
      setAuthInvalidateKey((prev) => prev + 1);
    }
  }
}, []);
```

**Key Point:** `getMe()` is called on mount to verify authentication. If token is missing/invalid, it will fail with 401.

---

## Authentication Flow

### 1. Login Flow

```
User enters credentials
        │
        ▼
POST /auth/login { email, password }
        │
        ▼
Backend validates credentials
        │
        ▼
Backend generates JWT accessToken
        │
        ▼
Backend returns { user, accessToken }
        │
        ▼
Frontend: authApi.login() extracts accessToken
        │
        ▼
Frontend: tokenStorage.setToken(accessToken)
        │
        ▼
Frontend: Redirects to /dashboard
        │
        ▼
Dashboard loads → AuthSessionProvider.checkAuth()
        │
        ▼
GET /auth/me with Authorization: Bearer <token>
        │
        ▼
Backend validates token → Returns user data
        │
        ▼
Frontend: User authenticated ✅
```

### 2. Subsequent API Calls

```
User action (e.g., load orgs)
        │
        ▼
apiClient.get('/orgs')
        │
        ▼
Request interceptor: tokenStorage.getToken()
        │
        ▼
Adds header: Authorization: Bearer <token>
        │
        ▼
GET /api/orgs with Authorization header
        │
        ▼
Backend: authMiddleware extracts token
        │
        ▼
Backend: Validates token → Sets req.user
        │
        ▼
Backend: Returns org data ✅
```

### 3. Token Expiry / Invalid Token

```
API call with expired token
        │
        ▼
Backend: authMiddleware verifies token
        │
        ▼
Backend: Token invalid → 401 Unauthorized
        │
        ▼
Frontend: Response interceptor catches 401
        │
        ▼
Frontend: tokenStorage.clearToken()
        │
        ▼
Frontend: window.location.href = '/login'
        │
        ▼
User redirected to login page
```

---

## Local vs Production Differences

### Local Development

**Backend:**
- Runs on: `http://localhost:4000`
- API Base: `http://localhost:4000/api`
- CORS: Allows `http://localhost:3000`

**Frontend:**
- Runs on: `http://localhost:3000`
- API Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'`
- Default: `http://localhost:4000/api` (if env var not set)

**Environment Variables:**
```bash
# frontend/.env.local (optional)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

# backend-node/.env (optional)
FRONTEND_URL=http://localhost:3000
```

### Production

**Backend:**
- Runs on: Your backend domain (e.g., `https://api.airunote.com`)
- API Base: `https://api.airunote.com/api`
- CORS: Must allow frontend domain

**Frontend:**
- Runs on: Your frontend domain (e.g., `https://airunote.com`)
- API Base URL: **MUST be set** in `NEXT_PUBLIC_API_BASE_URL`
- Example: `NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api`

**Environment Variables:**
```bash
# Vercel (Frontend)
NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api

# Backend (Render/Railway/etc.)
FRONTEND_URL=https://airunote.com
ALLOWED_DOMAINS=airunote.com
```

### Critical Differences

| Aspect | Local | Production |
|--------|-------|------------|
| **API Base URL** | `http://localhost:4000/api` (default) | **Must set** `NEXT_PUBLIC_API_BASE_URL` |
| **CORS** | `localhost:3000` allowed | Frontend domain must be in `FRONTEND_URL` or `ALLOWED_DOMAINS` |
| **Protocol** | HTTP | HTTPS (required for production) |
| **Token Storage** | Same (in-memory) | Same (in-memory) |
| **Proxy** | None | None |

---

## Token Storage & Transmission

### Storage Mechanism

**Current Implementation:**
- **Type:** Module variable (in-memory)
- **Location:** `frontend/lib/api/token.ts`
- **Scope:** Per-module instance (lost on refresh)

**Storage Lifecycle:**

```
1. User logs in
   → tokenStorage.setToken(token)
   → accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

2. User navigates (client-side)
   → Token persists ✅

3. User refreshes page
   → Module reloads
   → accessToken = null ❌
   → User must login again

4. User opens new tab
   → New module instance
   → accessToken = null ❌
   → User must login again
```

### Token Transmission

**Request Flow:**

```typescript
// 1. API call initiated
apiClient.get('/orgs')

// 2. Request interceptor runs
const token = tokenStorage.getToken();  // Gets token from memory
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}

// 3. Request sent
GET /api/orgs
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

// 4. Backend receives
req.headers.authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// 5. Backend extracts
const token = req.headers.authorization?.replace('Bearer ', '');
// token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Format

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjY2ZDMzOS1lN2RmLTQ5MzUtYTM3Yy0wNjY5NmY5ODZjMDIiLCJlbWFpbCI6ImFydmluamF5c29uY2FzdHJvQGdtYWlsLmNvbSIsImlhdCI6MTcxOTg1NjE5MywiZXhwIjoxNzE5ODU3MDkzfQ.signature
```

**Payload (decoded):**
```json
{
  "userId": "6666d339-e7df-4935-a37c-06696f986c02",
  "email": "arvinjaysoncastro@gmail.com",
  "iat": 1719856193,
  "exp": 1719857093
}
```

**Expiry:** Typically 15 minutes (900 seconds)

---

## Known Issues & Debugging

### Issue 1: "No token provided" Error

**Symptoms:**
```
[ERROR] UnauthorizedError: No token provided
at authMiddleware (authMiddleware.ts:28:13)
```

**Root Causes:**

1. **Token not stored after login:**
   - Check if `authApi.login()` successfully stores token
   - Verify response contains `data.data.accessToken`
   - Check browser console for errors during login

2. **Token lost on page refresh:**
   - **Expected behavior** (in-memory storage)
   - User must login again after refresh

3. **Token not attached to request:**
   - Check if `tokenStorage.getToken()` returns token
   - Verify request interceptor is running
   - Check Network tab: Request should have `Authorization` header

**Debugging Steps:**

```typescript
// 1. Check token storage after login
// In browser console:
import { tokenStorage } from '@/lib/api/token';
console.log('Token:', tokenStorage.getToken());

// 2. Check if token is in login response
// In authApi.login():
console.log('Login response:', response.data);
console.log('AccessToken:', response.data.data?.accessToken);

// 3. Check request headers
// In apiClient interceptor:
console.log('Token from storage:', tokenStorage.getToken());
console.log('Request headers:', config.headers);
```

### Issue 2: Cannot Login Locally

**Symptoms:**
- Login form submits but fails
- Error: "Login failed" or network error
- Backend shows "No token provided" for subsequent requests

**Possible Causes:**

1. **Backend not running:**
   ```bash
   # Check if backend is running
   curl http://localhost:4000/api/health
   ```

2. **CORS issue:**
   - Check backend CORS configuration
   - Verify `FRONTEND_URL=http://localhost:3000` in backend `.env`

3. **API Base URL incorrect:**
   - Check `NEXT_PUBLIC_API_BASE_URL` in frontend `.env.local`
   - Should be: `http://localhost:4000/api`

4. **Token not stored:**
   - Check browser console for errors
   - Verify login response contains `accessToken`

**Debugging Steps:**

```bash
# 1. Test backend directly
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Check frontend API base URL
# In browser console:
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

# 3. Check network request
# Open DevTools → Network tab
# Look for POST /auth/login request
# Check:
#   - Request URL (should be http://localhost:4000/api/auth/login)
#   - Request payload (email, password)
#   - Response (should contain accessToken)
```

### Issue 3: Token Lost on Page Refresh

**This is Expected Behavior (Current Implementation)**

**Why:**
- Token stored in module variable
- Module reloads on page refresh
- Variable resets to `null`

**Solutions (Future):**

1. **Use localStorage:**
   ```typescript
   // In token.ts
   export const tokenStorage = {
     getToken: (): string | null => {
       if (typeof window === 'undefined') return null;
       return localStorage.getItem('accessToken');
     },
     setToken: (token: string): void => {
       if (typeof window === 'undefined') return;
       localStorage.setItem('accessToken', token);
     },
     clearToken: (): void => {
       if (typeof window === 'undefined') return;
       localStorage.removeItem('accessToken');
     },
   };
   ```

2. **Use React Context:**
   - Store token in `AuthSessionProvider` state
   - Persist to localStorage on change
   - Load from localStorage on mount

### Issue 4: 401 Errors After Successful Login

**Symptoms:**
- Login succeeds
- Redirect to dashboard
- Immediately get 401 on `/auth/me` or other requests

**Possible Causes:**

1. **Token not stored:**
   - Check `tokenStorage.getToken()` after login
   - Verify `authApi.login()` stores token

2. **Token expired immediately:**
   - Check token expiry time
   - Verify backend token generation

3. **Request sent before token stored:**
   - Race condition: `router.push('/dashboard')` happens before token stored
   - Solution: Wait for token storage before redirect

**Debugging:**

```typescript
// In login page onSubmit:
const onSubmit = async (data: LoginInput) => {
  try {
    const response = await authApi.login(data);
    
    // ✅ Verify token is stored
    const token = tokenStorage.getToken();
    console.log('Token stored:', !!token);
    
    // ✅ Small delay to ensure token is set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    router.push('/dashboard');
  } catch (err) {
    // ...
  }
};
```

---

## Environment Variables

### Frontend (`.env.local`)

```bash
# Required for production
NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api

# Optional for local (defaults to http://localhost:4000/api)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### Backend (`.env`)

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# CORS Configuration
FRONTEND_URL=http://localhost:3000  # Local
# FRONTEND_URL=https://airunote.com  # Production

# Optional: Additional allowed domains
ALLOWED_DOMAINS=airunote.com,www.airunote.com

# Email (optional)
RESEND_API_KEY=re_...
EMAIL_FROM=airunote-noreply@baseofui.com
IS_EMAIL_LOGIN=true
```

---

## Summary

### Current State

✅ **Working:**
- Bearer token authentication
- Direct backend communication
- Simple error handling (401 → redirect)

❌ **Issues:**
- Token lost on page refresh (in-memory storage)
- No token refresh mechanism
- No persistence across tabs

### Recommendations

1. **Immediate Fix:**
   - Use `localStorage` for token persistence
   - Verify token is stored after login
   - Add logging to debug token flow

2. **Future Improvements:**
   - Implement token refresh
   - Add token expiry handling
   - Consider React Context for token management
   - Add token refresh before expiry

### Testing Checklist

- [ ] Login stores token
- [ ] Token attached to subsequent requests
- [ ] Protected routes work with token
- [ ] 401 errors redirect to login
- [ ] Logout clears token
- [ ] Page refresh requires re-login (current behavior)
- [ ] CORS configured correctly
- [ ] Environment variables set correctly

---

**Last Updated:** 2026-03-01  
**Version:** Bearer-Only MVP  
**Status:** ⚠️ In-Memory Storage (Token Lost on Refresh)

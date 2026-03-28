# AiruNote Authentication & Identity Flow – Full Implementation Audit

**Date:** 2026-03-01  
**Status:** Bearer Token Only (MVP)  
**Audit Type:** Complete Technical Analysis

---

## 1. High-Level Architecture Overview

### Frontend Framework
- **Framework:** Next.js 14.2.5 (App Router)
- **Language:** TypeScript
- **HTTP Client:** Axios
- **State Management:** React Context (AuthSessionProvider, OrgSessionProvider)

### Backend Framework
- **Framework:** Express.js
- **Language:** TypeScript
- **Authentication:** JWT (JSON Web Tokens)
- **Token Library:** `jsonwebtoken` v9.0.2

### Deployment

#### Local Development
- **Frontend URL:** `http://localhost:3000`
- **Backend URL:** `http://localhost:4000`
- **API Base URL:** `http://localhost:4000/api` (default, can be overridden)

#### Production
- **Frontend URL:** `https://airunote.com` (or configured domain)
- **Backend URL:** Configured via `NEXT_PUBLIC_API_BASE_URL` (e.g., `https://api.airunote.com`)
- **API Base URL:** Must be set in `NEXT_PUBLIC_API_BASE_URL` environment variable

### Proxy Usage

**❌ NO PROXY USED**

- **Previous State:** Next.js API route proxy existed at `/api/proxy/[...path]`
- **Current State:** Proxy route **DELETED** (`frontend/app/api/proxy/[...path]/route.ts` removed)
- **Communication:** Direct frontend → backend HTTP requests
- **Rationale:** Bearer token authentication eliminates need for same-origin cookie forwarding

**Proxy Directory Status:**
- Directory `frontend/app/api/proxy/[...path]/` still exists but is **empty**
- No route handler file present
- Can be safely removed

---

## 2. Login Flow – Step by Step

### 2.1 Frontend Login Process

#### File Handling Login
**Location:** `frontend/app/(auth)/login/page.tsx`

**Component Structure:**
```typescript
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.login(data);  // ← Login API call
      router.push('/dashboard');   // ← Redirect after success
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
}
```

#### API Call Implementation
**Location:** `frontend/lib/api/auth.ts`

```typescript
export const authApi = {
  login: async (input: LoginInput) => {
    const response = await apiClient.post('/auth/login', input);
    const data = response.data;
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);  // ← Token stored here
    }
    
    return data;
  },
};
```

#### Endpoint Called
- **URL:** `POST /auth/login`
- **Full URL (Local):** `http://localhost:4000/api/auth/login`
- **Full URL (Production):** `${NEXT_PUBLIC_API_BASE_URL}/auth/login`

#### Payload Sent
```typescript
{
  email: string;      // User email address
  password: string;   // Plain text password
}
```

**Validation:** Zod schema (`LoginSchema`) validates:
- Email format
- Password presence (min 1 character)

#### withCredentials Status
**❌ DISABLED**

**Location:** `frontend/lib/api/client.ts`
```typescript
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: NOT SET (defaults to false)
});
```

**Rationale:** Bearer token authentication does not require cookie credentials.

#### Authorization Header Usage
**✅ ENABLED (for protected routes only)**

**Request Interceptor:** `frontend/lib/api/client.ts`
```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;  // ← Attached here
    }
    return config;
  }
);
```

**Important:** Authorization header is **NOT** sent during login (no token exists yet). It is only attached to subsequent requests after token is stored.

### 2.2 Backend Login Process

#### Controller Handling Login
**Location:** `backend-node/src/api/routes/auth.routes.ts`

**Route Handler:**
```typescript
router.post('/login', authRateLimit, async (req: Request, res: Response, next) => {
  try {
    const input = LoginDto.parse(req.body);  // ← Zod validation
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
        accessToken,  // ← Token returned in JSON
      },
    });
  } catch (error) {
    next(error);
  }
});
```

#### Validation Process
**Location:** `backend-node/src/application/use-cases/AuthUseCase.ts`

**Steps:**
1. **Input Validation:** `LoginDto.parse(req.body)` validates email/password format
2. **User Lookup:** `userRepository.findByEmail(input.email)`
3. **User Status Check:** Verifies `user.isActive === true`
4. **Password Verification:** `passwordHasher.verify(input.password, user.passwordHash)`
5. **Token Generation:** `tokenService.generateAccessToken({ userId, email })`

**Error Cases:**
- Invalid email format → ValidationError
- User not found → UnauthorizedError: "Invalid credentials"
- User inactive → UnauthorizedError: "Invalid credentials"
- Wrong password → UnauthorizedError: "Invalid credentials"

#### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6666d339-e7df-4935-a37c-06696f986c02",
      "email": "user@example.com",
      "name": "User Name"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjY2ZDMzOS1lN2RmLTQ5MzUtYTM3Yy0wNjY5NmY5ODZjMDIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MTk4NTYxOTMsImV4cCI6MTcxOTg1NzA5M30.signature"
  }
}
```

**What is Returned:**
- ✅ **accessToken:** JWT token (15 minutes expiry, default)
- ❌ **refreshToken:** Generated but NOT returned (MVP)
- ❌ **Cookie:** NO cookies set
- ✅ **JSON:** Response is JSON only

#### Cookie Configuration
**❌ NO COOKIES USED**

**Previous Implementation (Removed):**
- Cookies were previously set with:
  - `httpOnly: true`
  - `secure: isProduction`
  - `sameSite: 'none'` (production) / `'lax'` (local)
  - `path: '/'`
  - `maxAge: 15 * 60 * 1000` (accessToken)
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (refreshToken)

**Current Implementation:**
- **NO `res.cookie()` calls**
- **NO cookie configuration**
- **NO cookie parsing in middleware**

#### JWT Usage
**✅ JWT IS USED**

**Token Service:** `backend-node/src/infrastructure/services/TokenService.ts`

**Token Generation:**
```typescript
generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: this.accessExpiresIn,  // Default: '15m'
  };
  return jwt.sign(payload, this.accessSecret, options);
}
```

**Token Payload:**
```typescript
interface TokenPayload {
  userId: string;
  email: string;
}
```

**Token Structure:**
```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjY2ZDMzOS1lN2RmLTQ5MzUtYTM3Yy0wNjY5NmY5ODZjMDIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MTk4NTYxOTMsImV4cCI6MTcxOTg1NzA5M30.signature
```

**Decoded Payload Example:**
```json
{
  "userId": "6666d339-e7df-4935-a37c-06696f986c02",
  "email": "user@example.com",
  "iat": 1719856193,
  "exp": 1719857093
}
```

#### JWT Secret Storage

**Environment Variables:**
- `JWT_ACCESS_SECRET` - Required for access token signing/verification
- `JWT_REFRESH_SECRET` - Required for refresh token (not currently used)
- `JWT_ACCESS_EXPIRES_IN` - Optional, default: `'15m'` (15 minutes)
- `JWT_REFRESH_EXPIRES_IN` - Optional, default: `'7d'` (7 days)

**Token Service Initialization:**
```typescript
constructor() {
  this.accessSecret = process.env.JWT_ACCESS_SECRET || '';
  this.refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  if (!this.accessSecret || !this.refreshSecret) {
    throw new Error('JWT secrets must be set in environment variables');
  }
}
```

**Security:**
- Secrets stored in environment variables (`.env` file)
- **NOT** committed to version control
- Must be set in both local and production environments

---

## 3. Identity Persistence

### How User Identity is Stored

#### Token Storage
**Location:** `frontend/lib/api/token.ts`

**Implementation:**
```typescript
let accessToken: string | null = null;  // ← Module variable (in-memory)

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

**Storage Type:** **In-Memory Module Variable**

**Characteristics:**
- ✅ Persists during same browser session (same page)
- ✅ Persists during client-side navigation (Next.js routing)
- ❌ **Lost on page refresh** (module reloads, variable resets)
- ❌ **Lost on new tab** (separate module instance)
- ❌ **Lost on browser restart**

#### User State Storage
**Location:** `frontend/providers/AuthSessionProvider.tsx`

**Implementation:**
```typescript
const [user, setUser] = useState<User | null>(null);
const [status, setStatus] = useState<AuthSessionStatus>('idle');
```

**Storage Type:** **React State (in-memory)**

**Persistence:**
- ✅ Persists during component lifecycle
- ❌ **Lost on page refresh**
- ❌ **Lost on navigation to external URL**
- ❌ **Lost on browser restart**

#### localStorage Usage
**❌ NOT USED**

- No `localStorage.setItem()` calls
- No `localStorage.getItem()` calls
- No persistent storage mechanism

#### Cookie Usage
**❌ NOT USED**

- No cookie reading
- No cookie writing
- No `document.cookie` access

### What Happens on Page Refresh

#### Token State
1. **Page Refreshes** → Browser reloads all JavaScript modules
2. **Module Variable Resets** → `accessToken = null` (initial value)
3. **Token Lost** → User must login again

#### User State
1. **Page Refreshes** → React components unmount
2. **State Resets** → `user = null` (initial state)
3. **Auth Check Triggered** → `AuthSessionProvider.checkAuth()` runs on mount

#### Auth Check Flow (After Refresh)
```typescript
// AuthSessionProvider.tsx - useEffect on mount
useEffect(() => {
  if (typeof window !== 'undefined') {
    checkAuth();  // ← Calls /auth/me
  }
}, [checkAuth]);

// checkAuth() implementation
const checkAuth = async () => {
  try {
    const res = await authApi.getMe();  // ← GET /auth/me
    // This will fail with 401 because token is null
  } catch (err) {
    // 401 error → User set to null → Redirect to login
  }
};
```

**Result:** User is redirected to `/login` because:
1. Token is `null` (lost on refresh)
2. `GET /auth/me` fails with 401
3. `AuthSessionProvider` sets `user = null`
4. `DashboardLayout` redirects to `/login`

### Refresh Token Endpoint

**Status:** **❌ DISABLED**

**Location:** `backend-node/src/api/routes/auth.routes.ts`

```typescript
router.post('/refresh', async (req: Request, res: Response) => {
  return res.status(501).json({
    success: false,
    error: { message: 'Refresh token endpoint disabled for MVP', code: 'NOT_IMPLEMENTED' },
  });
});
```

**Frontend Implementation:**
```typescript
refresh: async () => {
  throw new Error('Token refresh not implemented');
},
```

**Impact:**
- No automatic token renewal
- User must login again when token expires (15 minutes)
- No seamless session extension

### Token Expiration Handling

#### Token Expiry Time
- **Access Token:** 15 minutes (default, configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Refresh Token:** 7 days (generated but not used)

#### Expiration Detection

**Backend:**
```typescript
// authMiddleware.ts
const payload = tokenService.verifyAccessToken(token);
if (!payload) {
  throw new UnauthorizedError('Invalid or expired token');
}
```

**Token Service:**
```typescript
verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, this.accessSecret) as TokenPayload;
    // jwt.verify() throws if token is expired
  } catch {
    return null;  // Returns null on expiry or invalid signature
  }
}
```

**Frontend:**
```typescript
// Response interceptor
if (error.response?.status === 401) {
  tokenStorage.clearToken();
  window.location.href = '/login';  // ← Redirect on 401
}
```

**Behavior:**
- Expired token → Backend returns 401
- Frontend clears token → Redirects to login
- **No automatic refresh** → User must login again

---

## 4. Protected Route Flow

### 4.1 Frontend Protected Route Call

**Example:** Saving a document (`POST /internal/airunote/document`)

#### Request Flow

**1. API Call Initiated:**
```typescript
// frontend/components/airunote/services/airunoteApi.ts
const response = await apiClient.post('/internal/airunote/document', request);
```

**2. Request Interceptor Runs:**
```typescript
// frontend/lib/api/client.ts
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();  // ← Get token from memory
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // ← Attach header
  }
  return config;
});
```

**3. Request Sent:**
```
POST http://localhost:4000/api/internal/airunote/document
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
Body:
  { "name": "...", "content": "...", ... }
```

#### Authorization Header Attachment

**✅ ALWAYS ATTACHED (if token exists)**

**Code Path:**
1. `apiClient.post()` → Axios instance
2. Request interceptor → `tokenStorage.getToken()`
3. If token exists → `config.headers.Authorization = 'Bearer ' + token`
4. Request sent with header

**If Token Missing:**
- `tokenStorage.getToken()` returns `null`
- Authorization header **NOT** set
- Request sent without header
- Backend returns 401

#### Cookie Reliance

**❌ NO COOKIES USED**

- No `withCredentials: true`
- No cookie reading
- No cookie sending
- Pure Bearer token authentication

#### Proxy Modification

**❌ NO PROXY**

- Direct HTTP request to backend
- No intermediate Next.js API route
- No request modification
- No header manipulation

### 4.2 Backend Protected Route Validation

#### Identity Validation Process

**Middleware:** `backend-node/src/api/middleware/authMiddleware.ts`

**Flow:**
```typescript
export async function authMiddleware(req, res, next) {
  try {
    // 1. Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    // 2. Verify token
    const tokenService = container.resolve<ITokenService>(TYPES.ITokenService);
    const payload = tokenService.verifyAccessToken(token);
    
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    // 3. Set user context
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };
    
    next();  // ← Continue to route handler
  } catch (error) {
    next(error);  // ← Pass error to error handler
  }
}
```

#### Cookie Reading

**❌ NO COOKIE READING**

**Previous Implementation (Removed):**
```typescript
// OLD CODE (removed)
const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
```

**Current Implementation:**
```typescript
// CURRENT CODE
const token = req.headers.authorization?.replace('Bearer ', '');
// NO req.cookies usage
```

**Note:** `cookieParser()` middleware is still registered in `server.ts`, but it's not used for authentication.

#### Authorization Header Reading

**✅ PRIMARY METHOD**

**Extraction:**
```typescript
const token = req.headers.authorization?.replace('Bearer ', '');
```

**Header Format Expected:**
```
Authorization: Bearer <token>
```

**Case Sensitivity:**
- Header name: `authorization` (lowercase in Express)
- Prefix: `Bearer ` (case-sensitive, must include space)

#### Session Store

**❌ NO SESSION STORE**

- No Redis
- No database sessions
- No in-memory session store
- **Stateless authentication** (JWT only)

#### Middleware Used

**Primary Middleware:** `authMiddleware`

**Applied To:**
- `/api/orgs/*` - All org routes
- `/api/dashboard/*` - Dashboard routes
- `/api/auth/me` - Get current user
- `/api/auth/me/full` - Get full user data
- `/api/orgs/:orgId/airunote/lenses/*` - Lens routes
- Most internal routes

**Not Applied To:**
- `/api/auth/login` - Public
- `/api/auth/register` - Public
- `/api/auth/logout` - Public (no auth needed)
- `/api/health` - Public
- `/api/internal/airunote/*` - Some routes (temporary, no auth)

#### Missing Token Handling

**Backend Response:**
```typescript
if (!token) {
  throw new UnauthorizedError('No token provided');
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "code": "UNAUTHORIZED"
  }
}
```

**HTTP Status:** `401 Unauthorized`

**Frontend Handling:**
```typescript
// Response interceptor
if (error.response?.status === 401) {
  tokenStorage.clearToken();
  window.location.href = '/login';
}
```

---

## 5. Local vs Production Differences

### Local Development

#### CORS Configuration

**Backend:** `backend-node/src/api/server.ts`

```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',  // ← Hardcoded
]
.filter(Boolean)
.filter((value, index, self) => self.indexOf(value) === index);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);  // ← Allows server-side requests
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Check hostname match
    try {
      const originUrl = new URL(origin);
      const allowedHostnames = ['localhost', ...additionalDomains];
      if (allowedHostnames.includes(originUrl.hostname)) {
        return callback(null, true);
      }
    } catch (e) {
      console.error('[CORS] Error parsing origin URL:', e);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,  // ← Enabled (for potential future use)
}));
```

**Allowed Origins (Local):**
- `http://localhost:3000` (hardcoded)
- `process.env.FRONTEND_URL` (if set, defaults to `http://localhost:3000`)

**Credentials:** `true` (enabled, but not used for Bearer auth)

#### Cookie Behavior

**❌ NO COOKIES SET**

- Backend does not set cookies
- Frontend does not read cookies
- `credentials: true` in CORS is redundant (not harmful)

#### BaseURL

**Frontend:** `frontend/lib/api/client.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
```

**Default (Local):** `http://localhost:4000/api`

**Can Override:** Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`

#### Proxy Usage

**❌ NO PROXY**

- Direct HTTP requests
- No Next.js API route proxy
- No request forwarding

### Production

#### CORS Configuration

**Backend:** Same code, different environment variables

**Required Environment Variables:**
```bash
FRONTEND_URL=https://airunote.com
ALLOWED_DOMAINS=airunote.com,www.airunote.com
```

**Allowed Origins (Production):**
- `process.env.FRONTEND_URL` (must be set)
- Hostnames in `ALLOWED_DOMAINS` (comma-separated)

**Credentials:** `true` (same as local)

#### Cookie Behavior

**❌ NO COOKIES SET**

- Same as local (no cookies)

#### BaseURL

**Frontend:** **MUST BE SET**

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
```

**Production:** `NEXT_PUBLIC_API_BASE_URL` **MUST** be set in Vercel/environment

**Example:**
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api
```

**If Not Set:** Falls back to `http://localhost:4000/api` (will fail in production)

#### Proxy Usage

**❌ NO PROXY**

- Same as local (no proxy)

#### trust proxy Enabled

**✅ YES**

**Backend:** `backend-node/src/api/server.ts`

```typescript
app.set('trust proxy', 1);
```

**Purpose:**
- Required for platforms behind proxies (Render, Railway, etc.)
- Ensures correct IP addresses in `req.ip`
- Required for secure cookie handling (if cookies were used)
- **Not strictly needed for Bearer auth**, but harmless

### Complete Differences Table

| Aspect | Local | Production |
|--------|-------|------------|
| **Frontend URL** | `http://localhost:3000` | `https://airunote.com` (or configured) |
| **Backend URL** | `http://localhost:4000` | Configured (e.g., `https://api.airunote.com`) |
| **API Base URL** | `http://localhost:4000/api` (default) | **MUST SET** `NEXT_PUBLIC_API_BASE_URL` |
| **CORS Origins** | `localhost:3000` (hardcoded) | `FRONTEND_URL` + `ALLOWED_DOMAINS` |
| **Protocol** | HTTP | HTTPS (required) |
| **Cookie Setting** | None | None (same) |
| **Cookie Reading** | None | None (same) |
| **Proxy** | None | None (same) |
| **Token Storage** | In-memory | In-memory (same) |
| **Authorization Header** | Used | Used (same) |
| **withCredentials** | false | false (same) |
| **trust proxy** | Enabled | Enabled (same) |

---

## 6. Known Issues

### Issue 1: Cannot Login Locally

#### Symptoms
- Login form submits
- Error: "Login failed" or network error
- Backend logs: "No token provided" for subsequent requests
- User cannot access protected routes

#### Root Causes

**A. Token Not Stored After Login**

**Check:**
```typescript
// In browser console after login attempt
import { tokenStorage } from '@/lib/api/token';
console.log('Token:', tokenStorage.getToken());
// Should show token string, not null
```

**Possible Causes:**
1. Login response doesn't contain `accessToken`
2. Response structure mismatch
3. `tokenStorage.setToken()` not called
4. Error during login prevents token storage

**B. Backend Not Running**

**Check:**
```bash
curl http://localhost:4000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

**C. CORS Blocking**

**Check Backend Logs:**
```
[CORS] ❌ Origin not allowed: http://localhost:3000
```

**Fix:** Ensure `FRONTEND_URL=http://localhost:3000` in backend `.env`

**D. API Base URL Incorrect**

**Check:**
```typescript
// In browser console
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
// Should be: http://localhost:4000/api
```

**E. Network Error**

**Check Browser Network Tab:**
- Request URL should be: `http://localhost:4000/api/auth/login`
- Status should be: `200` or `201`
- Response should contain `accessToken`

#### Status Codes Returned

**Successful Login:**
- **Status:** `200 OK`
- **Response:** `{ success: true, data: { user, accessToken } }`

**Failed Login:**
- **Status:** `401 Unauthorized`
- **Response:** `{ success: false, error: { message: "Invalid credentials", code: "UNAUTHORIZED" } }`

**Missing Token (Subsequent Requests):**
- **Status:** `401 Unauthorized`
- **Response:** `{ success: false, error: { message: "No token provided", code: "UNAUTHORIZED" } }`

#### Headers Missing

**During Login (Expected):**
- ❌ No `Authorization` header (correct, no token yet)
- ✅ `Content-Type: application/json` (present)

**After Login (If Failing):**
- ❌ `Authorization: Bearer <token>` missing
- **Cause:** Token not stored or `tokenStorage.getToken()` returns `null`

#### Cookies Present

**❌ NO COOKIES EXPECTED**

- Login request: No cookies sent
- Login response: No `Set-Cookie` headers
- Subsequent requests: No cookies sent

**If Cookies Present:**
- Backend ignores them (not used for auth)
- Not harmful, but unnecessary

### Issue 2: Login/Save Fails in Production

#### Symptoms
- Login works locally, fails in production
- API calls return 401
- "No token provided" errors

#### Root Causes

**A. API Base URL Not Set**

**Check Vercel Environment Variables:**
```
NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api
```

**If Missing:** Frontend defaults to `http://localhost:4000/api` (will fail)

**B. CORS Misconfiguration**

**Backend Must Allow Frontend Origin:**
```bash
FRONTEND_URL=https://airunote.com
ALLOWED_DOMAINS=airunote.com
```

**C. HTTPS/HTTP Mismatch**

- Frontend: `https://airunote.com`
- Backend: `http://api.airunote.com` (wrong, must be HTTPS)

**D. Token Lost on Page Refresh**

**Expected Behavior:**
- Token stored in-memory
- Lost on refresh
- User must login again

**This is NOT a bug** - it's the current implementation.

### Issue 3: Token Lost on Page Refresh

#### Symptoms
- User logs in successfully
- User navigates app (works)
- User refreshes page
- User redirected to login
- Token is `null`

#### Root Cause

**In-Memory Storage:**
```typescript
let accessToken: string | null = null;  // ← Module variable
```

**On Page Refresh:**
1. Browser reloads all JavaScript
2. Module reinitializes
3. `accessToken` resets to `null`
4. Token lost

#### This is Expected Behavior (Current Implementation)

**Not a Bug:** This is the intended MVP behavior (in-memory storage).

**Impact:**
- User must login after every page refresh
- Poor user experience
- Not suitable for production

---

## 7. Security Model Classification

### Current Implementation: **Pure Bearer Token (Stateless JWT)**

#### Classification Details

**Authentication Type:** Bearer Token (JWT)

**State Management:** Stateless

**Token Storage:** In-Memory (Frontend)

**Token Transmission:** HTTP Authorization Header

**Session Management:** None (stateless)

#### Detailed Classification

**✅ Pure Bearer Token**
- Token sent in `Authorization: Bearer <token>` header
- No cookies used
- No session store
- Stateless authentication

**✅ Stateless**
- No server-side session storage
- No Redis/database sessions
- JWT contains all necessary user info
- Each request is independent

**❌ NOT Cookie-Based**
- No `Set-Cookie` headers
- No `Cookie` header reading
- No `withCredentials: true`
- No cookie parsing

**❌ NOT Hybrid**
- Not using both cookies and Bearer tokens
- Single authentication method (Bearer only)

**❌ NOT Session-Based**
- No server-side session store
- No session ID
- No session expiration management

#### Security Characteristics

**Strengths:**
- ✅ Stateless (scalable)
- ✅ No XSS risk from HttpOnly cookies (but token in memory is vulnerable)
- ✅ Works across domains (no CORS cookie issues)
- ✅ Simple implementation

**Weaknesses:**
- ❌ Token in JavaScript memory (XSS vulnerable)
- ❌ No token refresh (user must login every 15 minutes)
- ❌ Token lost on refresh (poor UX)
- ❌ No persistent storage (no "remember me")

---

## 8. Risk Assessment

### Structural Problems Identified

#### 🔴 CRITICAL: Token Stored in Memory (XSS Vulnerability)

**Risk:** High

**Issue:**
```typescript
let accessToken: string | null = null;  // ← Accessible to JavaScript
```

**Vulnerability:**
- Malicious script can read `tokenStorage.getToken()`
- XSS attack can steal token
- Token accessible via browser DevTools

**Mitigation (Not Implemented):**
- Use `localStorage` (still XSS vulnerable, but persists)
- Use `sessionStorage` (XSS vulnerable, but tab-scoped)
- Use HttpOnly cookies (not possible with Bearer-only)
- Implement Content Security Policy (CSP)

**Current Status:** ⚠️ Vulnerable to XSS

#### 🟡 MEDIUM: No Token Refresh

**Risk:** Medium

**Issue:**
- Token expires in 15 minutes
- No refresh mechanism
- User must login repeatedly

**Impact:**
- Poor user experience
- Frequent interruptions
- Potential data loss (unsaved work)

**Mitigation (Not Implemented):**
- Implement refresh token flow
- Auto-refresh before expiry
- Background token renewal

**Current Status:** ⚠️ No refresh mechanism

#### 🟡 MEDIUM: Token Lost on Refresh

**Risk:** Medium

**Issue:**
- In-memory storage loses token on page refresh
- User must login after every refresh

**Impact:**
- Poor user experience
- Workflow interruption
- User frustration

**Mitigation (Not Implemented):**
- Use `localStorage` for persistence
- Use `sessionStorage` for tab-scoped persistence
- Implement token restoration on mount

**Current Status:** ⚠️ Token not persisted

#### 🟢 LOW: Mixed Cookie + Bearer Usage

**Risk:** None (Not Applicable)

**Status:** ✅ Pure Bearer-only (no cookies)

#### 🟢 LOW: Proxy Stripping Cookies

**Risk:** None (Not Applicable)

**Status:** ✅ No proxy, no cookies

#### 🟢 LOW: SameSite Misconfigured

**Risk:** None (Not Applicable)

**Status:** ✅ No cookies used

#### 🟢 LOW: Secure Misconfigured

**Risk:** None (Not Applicable)

**Status:** ✅ No cookies used

#### 🟡 MEDIUM: Missing withCredentials

**Risk:** Low (Not Needed)

**Status:** ✅ Correctly omitted (Bearer auth doesn't need it)

**Note:** `withCredentials: true` is NOT needed for Bearer tokens. Current implementation is correct.

#### 🟡 MEDIUM: Domain Mismatch

**Risk:** Medium (Configuration Error)

**Issue:**
- Production requires `NEXT_PUBLIC_API_BASE_URL` to be set
- If not set, defaults to `localhost` (will fail)

**Impact:**
- Production deployment fails
- API calls go to wrong URL
- All requests fail

**Mitigation:**
- Ensure environment variable is set in production
- Add validation/warning if not set

**Current Status:** ⚠️ Requires manual configuration

#### 🟡 MEDIUM: CORS Misalignment

**Risk:** Medium (Configuration Error)

**Issue:**
- Backend must allow frontend origin
- Production requires `FRONTEND_URL` and/or `ALLOWED_DOMAINS`

**Impact:**
- CORS errors block all requests
- Login fails
- API calls fail

**Mitigation:**
- Ensure CORS environment variables are set
- Test CORS configuration

**Current Status:** ⚠️ Requires manual configuration

---

## 9. Final Technical Summary

### Current Auth Model

**Type:** Pure Bearer Token (Stateless JWT)

**Flow:**
1. User logs in → Backend returns JWT `accessToken` in JSON
2. Frontend stores token in module variable (in-memory)
3. Frontend attaches `Authorization: Bearer <token>` to all requests
4. Backend validates token via `authMiddleware`
5. Token expires in 15 minutes → User must login again

**Characteristics:**
- ✅ Stateless (scalable)
- ✅ Simple implementation
- ✅ Works across domains
- ❌ Token in JavaScript memory (XSS vulnerable)
- ❌ No persistence (lost on refresh)
- ❌ No refresh mechanism

### Why It Breaks

#### Local Login Failure

**Primary Cause:** Token not stored after login

**Possible Reasons:**
1. Login response structure mismatch
2. `tokenStorage.setToken()` not called
3. Error during login prevents token storage
4. Backend not running
5. CORS blocking request
6. API base URL incorrect

**Debugging Steps:**
1. Check browser console for errors
2. Check Network tab: Login request/response
3. Verify response contains `accessToken`
4. Check `tokenStorage.getToken()` after login
5. Verify backend is running
6. Check CORS configuration

#### Production Failure

**Primary Cause:** Configuration issues

**Common Issues:**
1. `NEXT_PUBLIC_API_BASE_URL` not set → Defaults to localhost
2. CORS not configured → Frontend origin not allowed
3. HTTPS/HTTP mismatch → Mixed content issues
4. Token lost on refresh → Expected behavior (in-memory)

### Minimal Fix Required

#### For Local Login Issue

**Step 1: Verify Token Storage**
```typescript
// Add logging in authApi.login()
login: async (input: LoginInput) => {
  const response = await apiClient.post('/auth/login', input);
  const data = response.data;
  
  console.log('Login response:', data);
  console.log('AccessToken present:', !!data.data?.accessToken);
  
  if (data.success && data.data?.accessToken) {
    tokenStorage.setToken(data.data.accessToken);
    console.log('Token stored:', !!tokenStorage.getToken());
  } else {
    console.error('Token NOT stored - response structure issue');
  }
  
  return data;
}
```

**Step 2: Verify Backend Response**
- Check backend logs for login success
- Verify response contains `accessToken`
- Check for errors during token generation

**Step 3: Verify API Base URL**
```typescript
// In browser console
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
// Should be: http://localhost:4000/api
```

#### For Production

**Step 1: Set Environment Variables**
```bash
# Vercel (Frontend)
NEXT_PUBLIC_API_BASE_URL=https://api.airunote.com/api

# Backend
FRONTEND_URL=https://airunote.com
ALLOWED_DOMAINS=airunote.com
```

**Step 2: Verify CORS**
- Check backend logs for CORS errors
- Verify frontend origin is allowed
- Test with `curl` to verify CORS headers

### Full Refactor Needed?

#### Current Assessment: **PARTIAL REFACTOR RECOMMENDED**

**What Works:**
- ✅ Bearer token authentication (correct approach)
- ✅ Stateless design (scalable)
- ✅ Simple error handling

**What Needs Fixing:**

**1. Token Persistence (HIGH PRIORITY)**
- **Current:** In-memory (lost on refresh)
- **Fix:** Use `localStorage` or `sessionStorage`
- **Effort:** Low (change storage mechanism)

**2. Token Refresh (MEDIUM PRIORITY)**
- **Current:** No refresh mechanism
- **Fix:** Implement refresh token flow
- **Effort:** Medium (backend + frontend changes)

**3. XSS Protection (MEDIUM PRIORITY)**
- **Current:** Token in JavaScript memory
- **Fix:** Implement CSP, sanitize inputs
- **Effort:** Medium (security hardening)

**4. Error Handling (LOW PRIORITY)**
- **Current:** Simple 401 → redirect
- **Fix:** Add retry logic, better error messages
- **Effort:** Low (UX improvements)

#### Recommended Refactor Plan

**Phase 1: Quick Fixes (1-2 hours)**
1. Change token storage to `localStorage`
2. Add token restoration on app mount
3. Add logging for debugging

**Phase 2: Token Refresh (4-6 hours)**
1. Re-enable refresh token endpoint
2. Implement refresh token storage
3. Add automatic token refresh before expiry
4. Handle refresh failures gracefully

**Phase 3: Security Hardening (2-4 hours)**
1. Implement CSP headers
2. Add input sanitization
3. Add rate limiting on frontend
4. Add token rotation

**Total Effort:** 7-12 hours for complete refactor

### Conclusion

**Current State:**
- ✅ Bearer token authentication correctly implemented
- ✅ Stateless design is sound
- ⚠️ Token persistence needs improvement
- ⚠️ Token refresh needs implementation
- ⚠️ XSS protection needs attention

**Immediate Action Required:**
1. Fix token storage (use `localStorage`)
2. Verify login flow works locally
3. Set production environment variables correctly

**Long-Term Improvements:**
1. Implement token refresh
2. Add security hardening
3. Improve error handling

**The architecture is sound, but the implementation needs refinement for production use.**

---

**End of Audit**

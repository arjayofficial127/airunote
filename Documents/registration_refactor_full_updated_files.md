# Registration Refactor Full Updated Files

## backend-node/src/domain/entities/PendingUser.ts

```ts
export type PendingUserStatus =
  | 'email_sent'
  | 'verified'
  | 'completed'
  | 'expired'
  | 'locked'
  | 'superseded';

export class PendingUser {
  constructor(
    public readonly id: string,
    public readonly registrationSessionId: string,
    public readonly email: string,
    public readonly verificationCodeHash: string,
    public readonly codeExpiresAt: Date,
    public readonly attempts: number,
    public readonly lastSentAt: Date,
    public readonly verifiedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly status: PendingUserStatus,
    public readonly tokenVersion: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
```

## backend-node/src/application/interfaces/IPendingUserRepository.ts

```ts
import { PendingUser } from '../../domain/entities/PendingUser';
import { User } from '../../domain/entities/User';

export type PendingUserVerificationResult =
  | { status: 'not-found' }
  | { status: 'invalid-state' }
  | { status: 'expired' }
  | { status: 'too-many-attempts' }
  | { status: 'email-mismatch' }
  | { status: 'invalid-code'; attempts: number }
  | { status: 'verified'; pendingUser: PendingUser };

export type PendingUserCompletionResult =
  | { status: 'created'; user: User }
  | { status: 'not-found' }
  | { status: 'invalid-state' }
  | { status: 'email-mismatch' }
  | { status: 'token-version-mismatch' }
  | { status: 'user-exists' };

export interface IPendingUserRepository {
  createRegistrationSession(
    pendingUser: Omit<PendingUser, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PendingUser>;
  findByEmail(email: string): Promise<PendingUser | null>;
  findByRegistrationSessionId(registrationSessionId: string): Promise<PendingUser | null>;
  findActiveByEmail(email: string): Promise<PendingUser | null>;
  supersedeActiveByEmail(email: string): Promise<void>;
  update(id: string, updates: Partial<Omit<PendingUser, 'id' | 'createdAt'>>): Promise<PendingUser>;
  verifyCode(input: {
    registrationSessionId: string;
    email: string;
    code: string;
    maxAttempts: number;
    verifyCode: (code: string, hash: string) => Promise<boolean>;
  }): Promise<PendingUserVerificationResult>;
  completeRegistration(input: {
    registrationSessionId: string;
    email: string;
    name: string;
    passwordHash: string;
    tokenVersion: number;
  }): Promise<PendingUserCompletionResult>;
}
```

## backend-node/src/application/dtos/auth.dto.ts

```ts
import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email(),
  secret: z.string().min(1).optional(),
});

export const ResumeRegistrationDto = z.object({
  resumeToken: z.string().min(1),
});

export const VerifyRegistrationCodeDto = z.object({
  registrationSessionId: z.string().uuid(),
  email: z.string().email(),
  code: z.string().regex(/^\d{8}$/, 'Verification code must be exactly 8 digits'),
});

export const ResendRegistrationCodeDto = z.object({
  registrationSessionId: z.string().uuid(),
  email: z.string().email(),
});

export const CompleteRegistrationDto = z.object({
  registrationSessionId: z.string().uuid(),
  setupToken: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type ResumeRegistrationInput = z.infer<typeof ResumeRegistrationDto>;
export type VerifyRegistrationCodeInput = z.infer<typeof VerifyRegistrationCodeDto>;
export type ResendRegistrationCodeInput = z.infer<typeof ResendRegistrationCodeDto>;
export type CompleteRegistrationInput = z.infer<typeof CompleteRegistrationDto>;
export type LoginInput = z.infer<typeof LoginDto>;

export interface RegistrationChallengeResponse {
  email: string;
  registrationSessionId: string | null;
  verificationRequired: true;
  verificationExpiresAt: string | null;
}

export interface ResumeRegistrationResponse {
  email: string;
  registrationSessionId: string;
  verificationRequired: true;
  verificationExpiresAt: string;
}

export interface RegistrationVerificationResponse {
  email: string;
  registrationSessionId: string;
  verified: true;
  setupToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}


```

## backend-node/src/infrastructure/services/TokenService.ts

```ts
import { injectable } from 'tsyringe';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface RegistrationTokenPayload {
  purpose: 'resume-registration' | 'complete-registration';
  sessionId: string;
  email: string;
  tokenVersion: number;
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): string;
  generateRefreshToken(payload: TokenPayload): string;
  generateResumeRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string;
  generateSetupRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): TokenPayload | null;
  verifyResumeRegistrationToken(token: string): RegistrationTokenPayload | null;
  verifySetupRegistrationToken(token: string): RegistrationTokenPayload | null;
}

@injectable()
export class TokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly registrationSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly registrationResumeExpiresIn: string;
  private readonly registrationSetupExpiresIn: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET || '';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || '';
    this.registrationSecret = process.env.JWT_REGISTRATION_SECRET || this.accessSecret;
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.registrationResumeExpiresIn = process.env.JWT_REGISTRATION_RESUME_EXPIRES_IN || '15m';
    this.registrationSetupExpiresIn = process.env.JWT_REGISTRATION_SETUP_EXPIRES_IN || '15m';

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error('JWT secrets must be set in environment variables');
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.accessExpiresIn as any,
    };
    return jwt.sign(payload, this.accessSecret, options);
  }

  generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.refreshExpiresIn as any,
    };
    return jwt.sign(payload, this.refreshSecret, options);
  }

  generateResumeRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string {
    return this.generateRegistrationToken(
      {
        ...payload,
        purpose: 'resume-registration',
      },
      this.registrationResumeExpiresIn
    );
  }

  generateSetupRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string {
    return this.generateRegistrationToken(
      {
        ...payload,
        purpose: 'complete-registration',
      },
      this.registrationSetupExpiresIn
    );
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  verifyResumeRegistrationToken(token: string): RegistrationTokenPayload | null {
    const payload = this.verifyRegistrationToken(token);
    if (!payload || payload.purpose !== 'resume-registration') {
      return null;
    }

    return payload;
  }

  verifySetupRegistrationToken(token: string): RegistrationTokenPayload | null {
    const payload = this.verifyRegistrationToken(token);
    if (!payload || payload.purpose !== 'complete-registration') {
      return null;
    }

    return payload;
  }

  private generateRegistrationToken(
    payload: RegistrationTokenPayload,
    expiresIn: string
  ): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any,
    };

    return jwt.sign(payload, this.registrationSecret, options);
  }

  private verifyRegistrationToken(token: string): RegistrationTokenPayload | null {
    try {
      return jwt.verify(token, this.registrationSecret) as RegistrationTokenPayload;
    } catch {
      return null;
    }
  }
}


```

## backend-node/src/infrastructure/email/email.types.ts

```ts
export interface BaseEmailPayload {
  to: string;
}

export interface OrgCreatedEmailPayload extends BaseEmailPayload {
  userName: string;
  orgName: string;
  dashboardUrl: string;
}

export interface LoginSuccessEmailPayload extends BaseEmailPayload {
  userName: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegistrationVerificationEmailPayload extends BaseEmailPayload {
  userName: string;
  verificationCode: string;
  resumeUrl: string;
  expiresInMinutes: number;
}

```

## backend-node/src/infrastructure/email/email.templates.ts

```ts
import {
  OrgCreatedEmailPayload,
  LoginSuccessEmailPayload,
  RegistrationVerificationEmailPayload,
} from './email.types';

export function renderOrgCreatedEmail(
  payload: OrgCreatedEmailPayload
): { subject: string; html: string } {
  const { userName, orgName, dashboardUrl } = payload;

  const subject = `Welcome to AiruNote - ${orgName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Welcome to AiruNote
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Your organization <strong style="color: #1a1a1a;">${orgName}</strong> has been successfully created. You're all set to start organizing your thoughts, structuring your projects, and building with how you see things.
              </p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Everything begins with your base.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8B; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; letter-spacing: 0.3px;">
                Go to Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                Â© 2020â€“2025 AOTECH / airunote. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b0b0b0;">
                This email was sent to notify you about your new organization.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

export function renderLoginSuccessEmail(
  payload: LoginSuccessEmailPayload
): { subject: string; html: string } {
  const { userName, loginTime, ipAddress, userAgent } = payload;

  const subject = 'Successful Login to AiruNote';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Login Successful
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                You have successfully logged into your AiruNote account.
              </p>
              <div style="background-color: #f9f9f9; border-left: 4px solid #1E3A8B; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 20px; color: #4a4a4a;">
                  <strong style="color: #1a1a1a;">Login Time:</strong> ${loginTime}
                </p>
                ${ipAddress ? `<p style="margin: 0 0 8px 0; font-size: 14px; line-height: 20px; color: #4a4a4a;"><strong style="color: #1a1a1a;">IP Address:</strong> ${ipAddress}</p>` : ''}
                ${userAgent ? `<p style="margin: 0; font-size: 14px; line-height: 20px; color: #4a4a4a;"><strong style="color: #1a1a1a;">Device:</strong> ${userAgent}</p>` : ''}
              </div>
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                If you did not perform this login, please secure your account immediately.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8B; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; letter-spacing: 0.3px;">
                Go to Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                Â© 2020â€“2025 AOTECH / airunote. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b0b0b0;">
                This email was sent for security purposes to notify you of account activity.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

export function renderRegistrationVerificationEmail(
  payload: RegistrationVerificationEmailPayload
): { subject: string; html: string } {
  const { userName, verificationCode, resumeUrl, expiresInMinutes } = payload;

  const subject = 'Verify your AiruNote account';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Verify your account
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Use the verification code below to finish creating your AiruNote account.
              </p>
              <div style="margin: 28px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #dbe4f0; border-radius: 10px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #64748b;">
                  Verification code
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; color: #0f172a;">
                  ${verificationCode}
                </p>
              </div>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #64748b;">
                This code expires in ${expiresInMinutes} minutes. If you enter the wrong code too many times, request a new one from the verification screen.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b;">
                The button below resumes your current registration session, but you still need to enter the code to continue.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${resumeUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8B; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; letter-spacing: 0.3px;">
                Continue setup
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                Â© 2020â€“2025 AOTECH / airunote. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b0b0b0;">
                This email was sent to finish your account registration.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

```

## backend-node/src/infrastructure/db/drizzle/schema.ts

```ts
/**
 * Drizzle ORM schema definitions
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  primaryKey,
  unique,
  index,
  uniqueIndex,
  bigint,
  jsonb,
  numeric,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const billingIntentStatusEnum = pgEnum('billing_intent_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
  'expired',
]);

export const pendingUserStatusEnum = pgEnum('pending_user_status', [
  'email_sent',
  'verified',
  'completed',
  'expired',
  'locked',
  'superseded',
]);

// User table
export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  defaultOrgId: uuid('default_org_id').references(() => orgsTable.id, { onDelete: 'set null' }),
  emailVerifiedAt: timestamp('email_verified_at'),
  registrationMfaCodeHash: varchar('registration_mfa_code_hash', { length: 255 }),
  registrationMfaExpiresAt: timestamp('registration_mfa_expires_at'),
  registrationMfaAttemptCount: integer('registration_mfa_attempt_count').notNull().default(0),
  registrationMfaLastSentAt: timestamp('registration_mfa_last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  defaultOrgIdx: index('users_default_org_idx').on(table.defaultOrgId),
}));

export const pendingUsersTable = pgTable('pending_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationSessionId: uuid('registration_session_id').notNull().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  verificationCodeHash: varchar('verification_code_hash', { length: 255 }).notNull(),
  codeExpiresAt: timestamp('code_expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastSentAt: timestamp('last_sent_at').notNull().defaultNow(),
  verifiedAt: timestamp('verified_at'),
  completedAt: timestamp('completed_at'),
  status: pendingUserStatusEnum('status').notNull().default('email_sent'),
  tokenVersion: integer('token_version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdx: uniqueIndex('pending_users_session_unique').on(table.registrationSessionId),
  emailIdx: index('pending_users_email_idx').on(table.email),
  expiresIdx: index('pending_users_code_expires_idx').on(table.codeExpiresAt),
  verifiedIdx: index('pending_users_verified_idx').on(table.verifiedAt),
  statusIdx: index('pending_users_status_idx').on(table.status),
}));

// SuperAdmin table
export const superAdminsTable = pgTable('super_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' })
    .unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Org table
export const orgsTable = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  subscriptionStatus: varchar('subscription_status', { length: 50 }),
  subscriptionId: varchar('subscription_id', { length: 255 }),
  currentPeriodEnd: timestamp('current_period_end'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('orgs_slug_idx').on(table.slug),
}));

export const webhookEventsTable = pgTable('webhook_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const billingIntentsTable = pgTable('billing_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  targetPlan: varchar('target_plan', { length: 50 }).notNull().default('pro'),
  source: varchar('source', { length: 100 }).notNull().default('unknown'),
  status: billingIntentStatusEnum('status').notNull().default('pending'),
  lemonSubscriptionId: varchar('lemon_subscription_id', { length: 255 }),
  lemonOrderId: varchar('lemon_order_id', { length: 255 }),
  lemonCustomerId: varchar('lemon_customer_id', { length: 255 }),
  lemonCustomerEmail: varchar('lemon_customer_email', { length: 255 }),
  lastEventName: varchar('last_event_name', { length: 100 }),
  failureReason: text('failure_reason'),
  completedAt: timestamp('completed_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgStatusIdx: index('billing_intents_org_status_idx').on(table.orgId, table.status),
  userStatusIdx: index('billing_intents_user_status_idx').on(table.createdByUserId, table.status),
  subscriptionIdx: index('billing_intents_subscription_idx').on(table.lemonSubscriptionId),
  subscriptionUniqueIdx: uniqueIndex('billing_intents_subscription_unique')
    .on(table.lemonSubscriptionId)
    .where(sql`${table.lemonSubscriptionId} IS NOT NULL`),
  orderIdx: index('billing_intents_order_idx').on(table.lemonOrderId),
  orderUniqueIdx: uniqueIndex('billing_intents_order_unique')
    .on(table.lemonOrderId)
    .where(sql`${table.lemonOrderId} IS NOT NULL`),
  customerIdx: index('billing_intents_customer_idx').on(table.lemonCustomerId),
  userEmailIdx: index('billing_intents_user_email_idx').on(table.userEmail),
  customerEmailIdx: index('billing_intents_customer_email_idx').on(table.lemonCustomerEmail),
  activePendingIdx: uniqueIndex('billing_intents_active_pending_unique')
    .on(table.orgId, table.createdByUserId, table.targetPlan)
    .where(sql`${table.status} = 'pending'::billing_intent_status`),
}));

// Role table
export const rolesTable = pgTable('roles', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  code: varchar('code', { length: 50 }).notNull().unique(),
});

// OrgUser table
export const orgUsersTable = pgTable('org_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgUserIdx: index('org_users_org_user_idx').on(table.orgId, table.userId),
  uniqueOrgUser: unique('org_users_org_user_unique').on(table.orgId, table.userId),
}));

// OrgUserRole table
export const orgUserRolesTable = pgTable('org_user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgUserId: uuid('org_user_id')
    .notNull()
    .references(() => orgUsersTable.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
    .notNull()
    .references(() => rolesTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgUserRoleIdx: index('org_user_roles_org_user_idx').on(table.orgUserId),
  uniqueOrgUserRole: unique('org_user_roles_org_user_role_unique').on(table.orgUserId, table.roleId),
}));

// AppSetting table
export const appSettingsTable = pgTable('app_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Post table
export const postsTable = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  body: text('body').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  objectKey: text('object_key'),
  previewObjectKey: text('preview_object_key'),
  payloadSize: integer('payload_size'),
  payloadHash: text('payload_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('posts_org_idx').on(table.orgId),
  authorIdx: index('posts_author_idx').on(table.authorUserId),
}));

// Post Attachment table
export const attachmentsTable = pgTable('post_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  postId: uuid('post_id')
    .notNull()
    .references(() => postsTable.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'image' | 'file' | 'video' | 'link'
  url: text('url').notNull(),
  fileName: text('file_name'),
  mimeType: text('mime_type'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  label: varchar('label', { length: 255 }),
  order: integer('order').notNull().default(0),
  fileId: uuid('file_id').references((): any => orgFilesTable.id, { onDelete: 'set null' }), // Reference to org_files if attached from library
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postIdx: index('post_attachments_post_idx').on(table.postId),
  orgIdx: index('post_attachments_org_idx').on(table.orgId),
  authorIdx: index('post_attachments_author_idx').on(table.authorUserId),
  fileIdx: index('post_attachments_file_idx').on(table.fileId),
}));

// Post Comment table
export const commentsTable = pgTable('post_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id')
    .notNull()
    .references(() => postsTable.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  objectKey: text('object_key'),
  previewObjectKey: text('preview_object_key'),
  payloadSize: integer('payload_size'),
  payloadHash: text('payload_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postIdx: index('post_comments_post_idx').on(table.postId),
  authorIdx: index('post_comments_author_idx').on(table.authorUserId),
}));

// PostLike table
export const postLikesTable = pgTable('post_likes', {
  postId: uuid('post_id')
    .notNull()
    .references(() => postsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postUserIdx: index('post_likes_post_user_idx').on(table.postId, table.userId),
  uniquePostUser: primaryKey({ columns: [table.postId, table.userId] }),
}));

// Collections table (V1.1 Future-Proof)
export const collectionsTable = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 50 }),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'private' | 'org' | 'public'
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  // V1.1 Future-Proofing fields
  tableCode: varchar('table_code', { length: 255 }).notNull().unique(),
  storageMode: varchar('storage_mode', { length: 50 }).notNull().default('single_table'), // 'single_table' | 'dedicated_table'
  physicalTable: varchar('physical_table', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgSlugIdx: index('collections_org_slug_idx').on(table.orgId, table.slug),
  uniqueOrgSlug: unique('collections_org_slug_unique').on(table.orgId, table.slug),
  tableCodeIdx: index('collections_table_code_idx').on(table.tableCode),
}));

// CollectionFields table
export const collectionFieldsTable = pgTable('collection_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collectionsTable.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multi_select'
  isRequired: boolean('is_required').notNull().default(false),
  order: integer('order').notNull().default(0),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  collectionIdx: index('collection_fields_collection_idx').on(table.collectionId),
  uniqueCollectionKey: unique('collection_fields_collection_key_unique').on(table.collectionId, table.key),
}));

// Collection Records table (V1.1 Shared Table)
export const recordsTable = pgTable('collection_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collectionsTable.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  objectKey: text('object_key'),
  previewObjectKey: text('preview_object_key'),
  payloadSize: integer('payload_size'),
  payloadHash: text('payload_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  collectionIdx: index('collection_records_collection_idx').on(table.collectionId),
  orgIdx: index('collection_records_org_idx').on(table.orgId),
  collectionOrgIdx: index('collection_records_collection_org_idx').on(table.collectionId, table.orgId),
}));

// Teams table
export const teamsTable = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  leadUserId: uuid('lead_user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('teams_org_idx').on(table.orgId),
  uniqueOrgName: unique('teams_org_name_unique').on(table.orgId, table.name),
}));

// TeamMembers table
export const teamMembersTable = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teamsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'), // 'member' | 'lead'
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  teamIdx: index('team_members_team_idx').on(table.teamId),
  userIdx: index('team_members_user_idx').on(table.userId),
  uniqueTeamUser: unique('team_members_team_user_unique').on(table.teamId, table.userId),
}));

// JoinCodes table (separate from orgs)
export const joinCodesTable = pgTable('join_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  allowedDomains: jsonb('allowed_domains').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(false),
  expiresAt: timestamp('expires_at'),
  defaultRoleId: integer('default_role_id').references(() => rolesTable.id),
  defaultTeamId: uuid('default_team_id').references(() => teamsTable.id, { onDelete: 'set null' }),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  welcomeMessage: text('welcome_message'),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'private' | 'public'
  notifyAdminsOnJoin: boolean('notify_admins_on_join').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  codeIdx: index('join_codes_code_idx').on(table.code),
  orgIdx: index('join_codes_org_idx').on(table.orgId),
}));

// JoinRequests table (for approval workflow)
export const joinRequestsTable = pgTable('join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  joinCodeId: uuid('join_code_id').references(() => joinCodesTable.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  message: text('message'), // Optional message from user
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  rejectionReason: text('rejection_reason'),
}, (table) => ({
  orgIdx: index('join_requests_org_idx').on(table.orgId),
  userIdx: index('join_requests_user_idx').on(table.userId),
  statusIdx: index('join_requests_status_idx').on(table.status),
  uniqueOrgUserPending: unique('join_requests_org_user_pending_unique').on(table.orgId, table.userId, table.status),
}));

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'join_request', 'join_approved', 'join_rejected', 'member_joined', etc.
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  relatedEntityType: varchar('related_entity_type', { length: 50 }), // 'org', 'team', 'post', 'join_request', etc.
  relatedEntityId: uuid('related_entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.isRead),
}));

// Org Files table (File Management App - Dropbox-like)
export const orgFilesTable = pgTable('org_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('supabase'), // 'supabase' | 'r2' | 'noop'
  storageKey: text('storage_key').notNull(), // The identifier used by IFileStorageService
  url: text('url').notNull(), // Computed public/base url OR resolved by service
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  checksum: text('checksum'), // Optional future
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'private' | 'org' | 'public' | 'users'
  objectKey: text('object_key'),
  previewObjectKey: text('preview_object_key'),
  payloadSize: integer('payload_size'),
  payloadHash: text('payload_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('org_files_org_idx').on(table.orgId),
  ownerIdx: index('org_files_owner_idx').on(table.ownerUserId),
  visibilityIdx: index('org_files_visibility_idx').on(table.visibility),
  orgVisibilityIdx: index('org_files_org_visibility_idx').on(table.orgId, table.visibility),
}));

// Org File Users table (join table for visibility='users')
export const orgFileUsersTable = pgTable('org_file_users', {
  fileId: uuid('file_id')
    .notNull()
    .references(() => orgFilesTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  fileUserIdx: index('org_file_users_file_user_idx').on(table.fileId, table.userId),
  uniqueFileUser: unique('org_file_users_file_user_unique').on(table.fileId, table.userId),
}));

// Org File Links table (optional for public share link codes)
export const orgFileLinksTable = pgTable('org_file_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id')
    .notNull()
    .references(() => orgFilesTable.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(), // Short code
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  codeIdx: index('org_file_links_code_idx').on(table.code),
  fileIdx: index('org_file_links_file_idx').on(table.fileId),
}));

// Airunote Enums
export const airuVisibilityEnum = pgEnum('airu_visibility', ['private', 'org', 'public']);
export const airuDocumentTypeEnum = pgEnum('airu_document_type', ['TXT', 'MD', 'RTF']);
export const airuDocumentStateEnum = pgEnum('airu_document_state', ['active', 'archived', 'trashed']);
export const airuShortcutTargetTypeEnum = pgEnum('airu_shortcut_target_type', ['folder', 'document']);
export const airuShareTypeEnum = pgEnum('airu_share_type', ['user', 'org', 'public', 'link']);
export const airuContentTypeEnum = pgEnum('airu_content_type', ['canonical', 'shared']);
// Folder type is now VARCHAR for flexibility (extended from enum)
// Valid types: 'box', 'board', 'book', 'canvas', 'collection', 'contacts', 
//              'ledger', 'journal', 'manual', 'notebook', 'pipeline', 'project', 'wiki'
export type AiruFolderType = 
  | 'box' | 'board' | 'book' | 'canvas' | 'collection' 
  | 'contacts' | 'ledger' | 'journal' | 'manual' 
  | 'notebook' | 'pipeline' | 'project' | 'wiki';

// Airu Folders table
export const airuFoldersTable = pgTable('airu_folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  parentFolderId: uuid('parent_folder_id')
    .notNull()
    .references(() => airuFoldersTable.id, { onDelete: 'restrict' }),
  humanId: varchar('human_id', { length: 255 }).notNull(),
  visibility: airuVisibilityEnum('visibility').notNull().default('private'),
  type: varchar('type', { length: 50 }).notNull().default('box'),
  metadata: jsonb('metadata'),
  defaultLensId: uuid('default_lens_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('airu_folders_org_idx').on(table.orgId),
  parentFolderIdx: index('airu_folders_parent_folder_idx').on(table.parentFolderId),
  uniqueOrgOwnerParentHuman: unique('airu_folders_org_owner_parent_human_unique').on(
    table.orgId,
    table.ownerUserId,
    table.parentFolderId,
    table.humanId
  ),
}));

// Airu Documents table
export const airuDocumentsTable = pgTable('airu_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  folderId: uuid('folder_id')
    .notNull()
    .references(() => airuFoldersTable.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: airuDocumentTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content'), // Made nullable for Phase 2 (deprecated in favor of canonical_content)
  canonicalContent: text('canonical_content').notNull().default(''),
  sharedContent: text('shared_content'), // nullable
  visibility: airuVisibilityEnum('visibility').notNull().default('private'),
  state: airuDocumentStateEnum('state').notNull().default('active'),
  attributes: jsonb('attributes').notNull().default('{}'), // Phase 7: Hybrid Attribute Engine
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  folderIdx: index('airu_documents_folder_idx').on(table.folderId),
  ownerIdx: index('airu_documents_owner_idx').on(table.ownerUserId),
  stateIdx: index('airu_documents_state_idx').on(table.state),
  uniqueFolderName: unique('airu_documents_folder_name_unique').on(table.folderId, table.name),
}));

// Airu Shortcuts table
export const airuShortcutsTable = pgTable('airu_shortcuts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  targetType: airuShortcutTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('airu_shortcuts_org_idx').on(table.orgId),
  ownerIdx: index('airu_shortcuts_owner_idx').on(table.ownerUserId),
  targetIdx: index('airu_shortcuts_target_idx').on(table.targetType, table.targetId),
}));

// Airu User Roots table
export const airuUserRootsTable = pgTable('airu_user_roots', {
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  rootFolderId: uuid('root_folder_id')
    .notNull()
    .references(() => airuFoldersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueOrgUser: unique('airu_user_roots_org_user_unique').on(table.orgId, table.userId),
}));

// Airu Shares table (Phase 2)
export const airuSharesTable = pgTable('airu_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  targetType: airuShortcutTargetTypeEnum('target_type').notNull(), // 'folder' | 'document'
  targetId: uuid('target_id').notNull(),
  shareType: airuShareTypeEnum('share_type').notNull(), // 'user' | 'org' | 'public' | 'link'
  grantedToUserId: uuid('granted_to_user_id').references(() => usersTable.id, { onDelete: 'cascade' }), // nullable
  linkCode: varchar('link_code', { length: 50 }), // nullable
  linkPasswordHash: varchar('link_password_hash', { length: 255 }), // nullable
  viewOnly: boolean('view_only').notNull().default(true),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // nullable
}, (table) => ({
  targetIdx: index('airu_shares_target_idx').on(table.targetType, table.targetId),
  userIdx: index('airu_shares_user_idx').on(table.grantedToUserId),
  linkCodeIdx: index('airu_shares_link_code_idx').on(table.linkCode),
  uniqueShare: unique('airu_shares_unique').on(
    table.orgId,
    table.targetType,
    table.targetId,
    table.shareType,
    table.grantedToUserId,
    table.linkCode
  ),
}));

// Airu Document Revisions table (Phase 2)
export const airuDocumentRevisionsTable = pgTable('airu_document_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => airuDocumentsTable.id, { onDelete: 'cascade' }),
  contentType: airuContentTypeEnum('content_type').notNull(), // 'canonical' | 'shared'
  content: text('content').notNull(),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  documentIdx: index('airu_document_revisions_document_idx').on(table.documentId),
  createdAtIdx: index('airu_document_revisions_created_at_idx').on(table.createdAt),
}));

// Airu Audit Logs table (Phase 3)
export const airuAuditLogsTable = pgTable('airu_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgsTable.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'vault_deleted', 'document_deleted', 'folder_deleted', 'share_revoked', 'link_revoked'
  targetType: varchar('target_type', { length: 50 }), // 'folder', 'document', 'vault', 'share', 'link'
  targetId: uuid('target_id'),
  performedByUserId: uuid('performed_by_user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('airu_audit_logs_org_idx').on(table.orgId),
  eventTypeIdx: index('airu_audit_logs_event_type_idx').on(table.eventType),
  createdAtIdx: index('airu_audit_logs_created_at_idx').on(table.createdAt),
}));

// Airu Lenses table (Phase 0 - Schema Freeze)
export const airuLensesTable = pgTable('airu_lenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  folderId: uuid('folder_id').references(() => airuFoldersTable.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'box' | 'board' | 'canvas' | 'book'
  isDefault: boolean('is_default').notNull().default(false),
  metadata: jsonb('metadata').notNull().default('{}'),
  query: jsonb('query'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  folderIdIdx: index('airu_lenses_folder_id_idx').on(table.folderId),
}));

// Airu Lens Items table (Projection Engine)
// Supports board, canvas, and book lens types
export const airuLensItemsTable = pgTable('airu_lens_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  lensId: uuid('lens_id').notNull().references(() => airuLensesTable.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull(),
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'document' | 'folder'
  columnId: varchar('column_id', { length: 100 }),
  order: numeric('order'),
  x: numeric('x'),
  y: numeric('y'),
  viewMode: varchar('view_mode', { length: 20 }), // 'list' | 'icon' | 'preview' | 'full' | null
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  lensIdIdx: index('idx_lens_items_lens_id').on(table.lensId),
  lensEntityIdx: index('idx_lens_items_lens_entity').on(table.lensId, table.entityType, table.entityId),
  lensColumnIdx: index('idx_lens_items_lens_column').on(table.lensId, table.columnId),
}));

```

## backend-node/src/infrastructure/persistence/PendingUserRepository.ts

```ts
import { injectable } from 'tsyringe';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { pendingUsersTable, usersTable } from '../db/drizzle/schema';
import {
  IPendingUserRepository,
  PendingUserCompletionResult,
  PendingUserVerificationResult,
} from '../../application/interfaces/IPendingUserRepository';
import { PendingUser, PendingUserStatus } from '../../domain/entities/PendingUser';
import { User } from '../../domain/entities/User';

type PendingUserRow = typeof pendingUsersTable.$inferSelect;
type UserRow = typeof usersTable.$inferSelect;

@injectable()
export class PendingUserRepository implements IPendingUserRepository {
  async createRegistrationSession(
    pendingUser: Omit<PendingUser, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PendingUser> {
    const now = new Date();

    const [record] = await db
      .insert(pendingUsersTable)
      .values({
        registrationSessionId: pendingUser.registrationSessionId,
        email: pendingUser.email,
        verificationCodeHash: pendingUser.verificationCodeHash,
        codeExpiresAt: pendingUser.codeExpiresAt,
        attempts: pendingUser.attempts,
        lastSentAt: pendingUser.lastSentAt,
        verifiedAt: pendingUser.verifiedAt,
        completedAt: pendingUser.completedAt,
        status: pendingUser.status,
        tokenVersion: pendingUser.tokenVersion,
        updatedAt: now,
      })
      .returning();

    return this.mapPendingUser(record);
  }

  async findByEmail(email: string): Promise<PendingUser | null> {
    const [record] = await db
      .select()
      .from(pendingUsersTable)
      .where(eq(pendingUsersTable.email, email))
      .orderBy(desc(pendingUsersTable.updatedAt))
      .limit(1);

    return record ? this.mapPendingUser(record) : null;
  }

  async findByRegistrationSessionId(registrationSessionId: string): Promise<PendingUser | null> {
    const [record] = await db
      .select()
      .from(pendingUsersTable)
      .where(eq(pendingUsersTable.registrationSessionId, registrationSessionId))
      .limit(1);

    return record ? this.mapPendingUser(record) : null;
  }

  async findActiveByEmail(email: string): Promise<PendingUser | null> {
    const [record] = await db
      .select()
      .from(pendingUsersTable)
      .where(
        and(
          eq(pendingUsersTable.email, email),
          inArray(pendingUsersTable.status, ['email_sent', 'verified'])
        )
      )
      .orderBy(desc(pendingUsersTable.updatedAt))
      .limit(1);

    return record ? this.mapPendingUser(record) : null;
  }

  async supersedeActiveByEmail(email: string): Promise<void> {
    // Superseding older sessions invalidates prior resume/setup tokens without deleting audit state.
    await db
      .update(pendingUsersTable)
      .set({
        status: 'superseded',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pendingUsersTable.email, email),
          ne(pendingUsersTable.status, 'completed'),
          ne(pendingUsersTable.status, 'superseded')
        )
      );
  }

  async update(
    id: string,
    updates: Partial<Omit<PendingUser, 'id' | 'createdAt'>>
  ): Promise<PendingUser> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.registrationSessionId !== undefined) updateData.registrationSessionId = updates.registrationSessionId;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.verificationCodeHash !== undefined) updateData.verificationCodeHash = updates.verificationCodeHash;
    if (updates.codeExpiresAt !== undefined) updateData.codeExpiresAt = updates.codeExpiresAt;
    if (updates.attempts !== undefined) updateData.attempts = updates.attempts;
    if (updates.lastSentAt !== undefined) updateData.lastSentAt = updates.lastSentAt;
    if (updates.verifiedAt !== undefined) updateData.verifiedAt = updates.verifiedAt;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tokenVersion !== undefined) updateData.tokenVersion = updates.tokenVersion;
    if (updates.updatedAt !== undefined) updateData.updatedAt = updates.updatedAt;

    const [record] = await db
      .update(pendingUsersTable)
      .set(updateData)
      .where(eq(pendingUsersTable.id, id))
      .returning();

    return this.mapPendingUser(record);
  }

  async verifyCode(input: {
    registrationSessionId: string;
    email: string;
    code: string;
    maxAttempts: number;
    verifyCode: (code: string, hash: string) => Promise<boolean>;
  }): Promise<PendingUserVerificationResult> {
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT
          id,
          registration_session_id,
          email,
          verification_code_hash,
          code_expires_at,
          attempts,
          last_sent_at,
          verified_at,
          completed_at,
          status,
          token_version,
          created_at,
          updated_at
        FROM pending_users
        WHERE registration_session_id = ${input.registrationSessionId}
        FOR UPDATE
      `);

      const record = lockedRows[0] as {
        id: string;
        registration_session_id: string;
        email: string;
        verification_code_hash: string;
        code_expires_at: Date;
        attempts: number;
        last_sent_at: Date;
        verified_at: Date | null;
        completed_at: Date | null;
        status: PendingUserStatus;
        token_version: number;
        created_at: Date;
        updated_at: Date;
      } | undefined;

      if (!record) {
        return { status: 'not-found' };
      }

      const pendingUser = new PendingUser(
        record.id,
        record.registration_session_id,
        record.email,
        record.verification_code_hash,
        record.code_expires_at,
        record.attempts,
        record.last_sent_at,
        record.verified_at,
        record.completed_at,
        record.status,
        record.token_version,
        record.created_at,
        record.updated_at
      );

      if (pendingUser.status !== 'email_sent') {
        return { status: 'invalid-state' };
      }

      if (pendingUser.attempts >= input.maxAttempts) {
        await tx
          .update(pendingUsersTable)
          .set({
            status: 'locked',
            updatedAt: new Date(),
          })
          .where(eq(pendingUsersTable.id, pendingUser.id));

        return { status: 'too-many-attempts' };
      }

      if (pendingUser.codeExpiresAt.getTime() < Date.now()) {
        await tx
          .update(pendingUsersTable)
          .set({
            status: 'expired',
            updatedAt: new Date(),
          })
          .where(eq(pendingUsersTable.id, pendingUser.id));

        return { status: 'expired' };
      }

      if (pendingUser.email !== input.email) {
        return { status: 'email-mismatch' };
      }

      const isValidCode = await input.verifyCode(input.code, pendingUser.verificationCodeHash);
      if (!isValidCode) {
        const attempts = pendingUser.attempts + 1;
        const isLocked = attempts >= input.maxAttempts;

        await tx
          .update(pendingUsersTable)
          .set({
            attempts,
            status: isLocked ? 'locked' : pendingUser.status,
            updatedAt: new Date(),
          })
          .where(eq(pendingUsersTable.id, pendingUser.id));

        if (isLocked) {
          return { status: 'too-many-attempts' };
        }

        return { status: 'invalid-code', attempts };
      }

      await tx
        .update(pendingUsersTable)
        .set({
          verifiedAt: new Date(),
          attempts: 0,
          status: 'verified',
          updatedAt: new Date(),
        })
        .where(eq(pendingUsersTable.id, pendingUser.id));

      const [updatedRecord] = await tx
        .select()
        .from(pendingUsersTable)
        .where(eq(pendingUsersTable.id, pendingUser.id))
        .limit(1);

      return {
        status: 'verified',
        pendingUser: this.mapPendingUser(updatedRecord),
      };
    });
  }

  async completeRegistration(input: {
    registrationSessionId: string;
    email: string;
    name: string;
    passwordHash: string;
    tokenVersion: number;
  }): Promise<PendingUserCompletionResult> {
    // User creation and session completion happen in one transaction to prevent duplicate or half-finished registration state.
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT
          id,
          registration_session_id,
          email,
          verification_code_hash,
          code_expires_at,
          attempts,
          last_sent_at,
          verified_at,
          completed_at,
          status,
          token_version,
          created_at,
          updated_at
        FROM pending_users
        WHERE registration_session_id = ${input.registrationSessionId}
        FOR UPDATE
      `);

      const record = lockedRows[0] as {
        id: string;
        registration_session_id: string;
        email: string;
        verification_code_hash: string;
        code_expires_at: Date;
        attempts: number;
        last_sent_at: Date;
        verified_at: Date | null;
        completed_at: Date | null;
        status: PendingUserStatus;
        token_version: number;
        created_at: Date;
        updated_at: Date;
      } | undefined;

      if (!record) {
        return { status: 'not-found' };
      }

      if (
        record.status === 'completed' ||
        record.status === 'expired' ||
        record.status === 'locked' ||
        record.status === 'superseded' ||
        record.status !== 'verified'
      ) {
        return { status: 'invalid-state' };
      }

      if (record.email !== input.email) {
        return { status: 'email-mismatch' };
      }

      if (record.token_version !== input.tokenVersion) {
        return { status: 'token-version-mismatch' };
      }

      const [createdUser] = await tx
        .insert(usersTable)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          name: input.name,
          isActive: true,
          defaultOrgId: null,
          emailVerifiedAt: record.verified_at,
          registrationMfaCodeHash: null,
          registrationMfaExpiresAt: null,
          registrationMfaAttemptCount: 0,
          registrationMfaLastSentAt: null,
        })
        .onConflictDoNothing({
          target: usersTable.email,
        })
        .returning();

      if (!createdUser) {
        return { status: 'user-exists' };
      }

      await tx
        .update(pendingUsersTable)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pendingUsersTable.id, record.id));

      return {
        status: 'created',
        user: this.mapUser(createdUser),
      };
    });
  }

  private mapPendingUser(record: PendingUserRow): PendingUser {
    return new PendingUser(
      record.id,
      record.registrationSessionId,
      record.email,
      record.verificationCodeHash,
      record.codeExpiresAt,
      record.attempts,
      record.lastSentAt,
      record.verifiedAt,
      record.completedAt,
      record.status,
      record.tokenVersion,
      record.createdAt,
      record.updatedAt
    );
  }

  private mapUser(record: UserRow): User {
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      record.name,
      record.isActive,
      record.defaultOrgId,
      record.emailVerifiedAt,
      record.registrationMfaCodeHash,
      record.registrationMfaExpiresAt,
      record.registrationMfaAttemptCount,
      record.registrationMfaLastSentAt,
      record.createdAt
    );
  }
}
```

## backend-node/src/application/use-cases/AuthUseCase.ts

```ts
import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
} from '../../core/errors/AppError';
import { PendingUser } from '../../domain/entities/PendingUser';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IPendingUserRepository } from '../interfaces/IPendingUserRepository';
import { IAppSettingRepository } from '../interfaces/IAppSettingRepository';
import { IPasswordHasherService } from '../../infrastructure/services/PasswordHasherService';
import { ITokenService } from '../../infrastructure/services/TokenService';
import { IEmailService } from '../../infrastructure/email/email.service';
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  RegistrationChallengeResponse,
  RegistrationVerificationResponse,
  ResumeRegistrationInput,
  ResumeRegistrationResponse,
  VerifyRegistrationCodeInput,
  ResendRegistrationCodeInput,
  CompleteRegistrationInput,
} from '../dtos/auth.dto';
import { TYPES } from '../../core/di/types';

export interface IAuthUseCase {
  register(input: RegisterInput): Promise<Result<RegistrationChallengeResponse, Error>>;
  resumeRegistration(input: ResumeRegistrationInput): Promise<Result<ResumeRegistrationResponse, Error>>;
  verifyRegistrationCode(input: VerifyRegistrationCodeInput): Promise<Result<RegistrationVerificationResponse, Error>>;
  resendRegistrationCode(input: ResendRegistrationCodeInput): Promise<Result<RegistrationChallengeResponse, Error>>;
  completeRegistration(input: CompleteRegistrationInput): Promise<Result<AuthResponse, Error>>;
  login(input: LoginInput): Promise<Result<AuthResponse, Error>>;
  refreshToken(refreshToken: string): Promise<Result<AuthResponse, Error>>;
}

const REGISTRATION_CODE_EXPIRY_MINUTES = 10;
const MAX_REGISTRATION_CODE_ATTEMPTS = 5;
const REGISTRATION_RESEND_COOLDOWN_MS = 60 * 1000;
const GENERIC_REGISTRATION_SESSION_ERROR = 'Invalid or expired registration session. Start again.';
const GENERIC_VERIFICATION_ERROR = 'Invalid or expired verification code. Request a new code and try again.';

@injectable()
export class AuthUseCase implements IAuthUseCase {
  constructor(
    @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
    @inject(TYPES.IPendingUserRepository) private pendingUserRepository: IPendingUserRepository,
    @inject(TYPES.IAppSettingRepository)
    private appSettingRepository: IAppSettingRepository,
    @inject(TYPES.IPasswordHasherService)
    private passwordHasher: IPasswordHasherService,
    @inject(TYPES.ITokenService) private tokenService: ITokenService,
    @inject(TYPES.IEmailService) private emailService: IEmailService
  ) {}

  async register(input: RegisterInput): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);

    const registrationSecretValidation = await this.validateRegistrationSecret(input.secret);
    if (registrationSecretValidation.isErr()) {
      return Result.err(registrationSecretValidation.error);
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return Result.ok(this.toGenericRegistrationChallengeResponse(normalizedEmail));
    }

    const activePendingUser = await this.pendingUserRepository.findActiveByEmail(normalizedEmail);
    if (
      activePendingUser &&
      activePendingUser.status === 'email_sent' &&
      activePendingUser.lastSentAt.getTime() + REGISTRATION_RESEND_COOLDOWN_MS > Date.now()
    ) {
      return Result.ok(
        this.toRegistrationChallengeResponse(
          activePendingUser.email,
          activePendingUser.registrationSessionId,
          activePendingUser.codeExpiresAt
        )
      );
    }

    // Older sessions must be invalidated so stale codes and tokens cannot be replayed.
    await this.pendingUserRepository.supersedeActiveByEmail(normalizedEmail);

    const challenge = await this.createRegistrationChallenge();
    const pendingUser = await this.pendingUserRepository.createRegistrationSession({
      registrationSessionId: randomUUID(),
      email: normalizedEmail,
      verificationCodeHash: challenge.codeHash,
      codeExpiresAt: challenge.expiresAt,
      attempts: 0,
      lastSentAt: challenge.sentAt,
      verifiedAt: null,
      completedAt: null,
      status: 'email_sent',
      tokenVersion: 1,
    });

    const sendResult = await this.sendRegistrationVerification(pendingUser, challenge.code);
    if (sendResult.isErr()) {
      return Result.err(sendResult.error);
    }

    return Result.ok(
      this.toRegistrationChallengeResponse(
        pendingUser.email,
        pendingUser.registrationSessionId,
        challenge.expiresAt
      )
    );
  }

  async resumeRegistration(
    input: ResumeRegistrationInput
  ): Promise<Result<ResumeRegistrationResponse, Error>> {
    const payload = this.tokenService.verifyResumeRegistrationToken(input.resumeToken);
    if (!payload) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(payload.sessionId);
    if (!pendingUser) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);
    if (
      refreshedPendingUser.status !== 'email_sent' ||
      refreshedPendingUser.email !== payload.email ||
      refreshedPendingUser.tokenVersion !== payload.tokenVersion
    ) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    return Result.ok({
      email: refreshedPendingUser.email,
      registrationSessionId: refreshedPendingUser.registrationSessionId,
      verificationRequired: true,
      verificationExpiresAt: refreshedPendingUser.codeExpiresAt.toISOString(),
    });
  }

  async verifyRegistrationCode(
    input: VerifyRegistrationCodeInput
  ): Promise<Result<RegistrationVerificationResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const verificationResult = await this.pendingUserRepository.verifyCode({
      registrationSessionId: input.registrationSessionId,
      email: normalizedEmail,
      code: input.code,
      maxAttempts: MAX_REGISTRATION_CODE_ATTEMPTS,
      verifyCode: (code, hash) => this.passwordHasher.verify(code, hash),
    });

    if (verificationResult.status !== 'verified') {
      return Result.err(this.invalidVerificationError());
    }

    const setupToken = this.tokenService.generateSetupRegistrationToken({
      sessionId: verificationResult.pendingUser.registrationSessionId,
      email: verificationResult.pendingUser.email,
      tokenVersion: verificationResult.pendingUser.tokenVersion,
    });

    return Result.ok({
      email: normalizedEmail,
      registrationSessionId: verificationResult.pendingUser.registrationSessionId,
      verified: true,
      setupToken,
    });
  }

  async resendRegistrationCode(
    input: ResendRegistrationCodeInput
  ): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(
      input.registrationSessionId
    );

    if (!pendingUser || pendingUser.email !== normalizedEmail) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    if (!['email_sent', 'verified', 'expired'].includes(refreshedPendingUser.status)) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const cooldownEndsAt = refreshedPendingUser.lastSentAt.getTime() + REGISTRATION_RESEND_COOLDOWN_MS;
    if (cooldownEndsAt > Date.now()) {
      return Result.err(
        new AppError(
          'Please wait before requesting a new code.',
          429,
          'RESEND_COOLDOWN'
        )
      );
    }

    const challenge = await this.createRegistrationChallenge();
    const updatedPendingUser = await this.pendingUserRepository.update(refreshedPendingUser.id, {
      verificationCodeHash: challenge.codeHash,
      codeExpiresAt: challenge.expiresAt,
      attempts: 0,
      lastSentAt: challenge.sentAt,
      verifiedAt: null,
      completedAt: null,
      status: 'email_sent',
      tokenVersion: refreshedPendingUser.tokenVersion + 1,
    });

    const sendResult = await this.sendRegistrationVerification(updatedPendingUser, challenge.code);
    if (sendResult.isErr()) {
      return Result.err(sendResult.error);
    }

    return Result.ok(
      this.toRegistrationChallengeResponse(
        updatedPendingUser.email,
        updatedPendingUser.registrationSessionId,
        challenge.expiresAt
      )
    );
  }

  async completeRegistration(
    input: CompleteRegistrationInput
  ): Promise<Result<AuthResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const normalizedName = input.name.trim();

    const setupTokenPayload = this.tokenService.verifySetupRegistrationToken(input.setupToken);
    if (!setupTokenPayload) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    if (
      setupTokenPayload.sessionId !== input.registrationSessionId ||
      setupTokenPayload.email !== normalizedEmail
    ) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(
      input.registrationSessionId
    );
    if (!pendingUser) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);
    if (
      refreshedPendingUser.email !== normalizedEmail ||
      refreshedPendingUser.status !== 'verified' ||
      refreshedPendingUser.tokenVersion !== setupTokenPayload.tokenVersion
    ) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const completionResult = await this.pendingUserRepository.completeRegistration({
      registrationSessionId: input.registrationSessionId,
      email: normalizedEmail,
      name: normalizedName,
      passwordHash,
      tokenVersion: setupTokenPayload.tokenVersion,
    });

    if (completionResult.status !== 'created') {
      return Result.err(this.invalidRegistrationSessionError());
    }

    const createdUser = completionResult.user;
    const accessToken = this.tokenService.generateAccessToken({
      userId: createdUser.id,
      email: createdUser.email,
    });
    const refreshToken = this.tokenService.generateRefreshToken({
      userId: createdUser.id,
      email: createdUser.email,
    });

    return Result.ok({
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      },
      accessToken,
      refreshToken,
    });
  }

  async login(input: LoginInput): Promise<Result<AuthResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || !user.isActive) {
      const pendingUser = await this.pendingUserRepository.findActiveByEmail(normalizedEmail);
      if (pendingUser) {
        if (pendingUser.status === 'verified') {
          return Result.err(new UnauthorizedError('Please complete your registration before signing in'));
        }

        return Result.err(new UnauthorizedError('Please verify your email before signing in'));
      }

      return Result.err(new UnauthorizedError('Invalid credentials'));
    }

    if (!user.emailVerifiedAt) {
      return Result.err(new UnauthorizedError('Please verify your email before signing in'));
    }

    const isValid = await this.passwordHasher.verify(input.password, user.passwordHash);

    if (!isValid) {
      return Result.err(new UnauthorizedError('Invalid credentials'));
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return Result.ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  }

  async refreshToken(refreshToken: string): Promise<Result<AuthResponse, Error>> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    if (!payload) {
      return Result.err(new UnauthorizedError('Invalid refresh token'));
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      return Result.err(new UnauthorizedError('User not found or inactive'));
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const newRefreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return Result.ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: newRefreshToken,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async validateRegistrationSecret(secret?: string): Promise<Result<void, Error>> {
    const isRegistrationSecretEnabled = process.env.IS_REGISTRATION_SECRET === 'true';

    if (!isRegistrationSecretEnabled) {
      return Result.ok(undefined);
    }

    const registrationSecret = await this.appSettingRepository.findByKey('registration_secret');
    const expectedSecret = registrationSecret || process.env.REGISTRATION_SECRET || '';

    if (!expectedSecret) {
      return Result.err(
        new AppError('Registration secret is not configured', 503, 'REGISTRATION_UNAVAILABLE')
      );
    }

    if (!secret) {
      return Result.err(new ValidationError('Registration secret is required'));
    }

    if (secret !== expectedSecret) {
      return Result.err(new ValidationError('Invalid registration secret'));
    }

    return Result.ok(undefined);
  }

  private async createRegistrationChallenge(): Promise<{
    code: string;
    codeHash: string;
    expiresAt: Date;
    sentAt: Date;
  }> {
    const code = this.generateRegistrationCode();
    // Only the hash is stored so the raw verification code is never persisted.
    const codeHash = await this.passwordHasher.hash(code);
    const sentAt = new Date();
    const expiresAt = new Date(sentAt.getTime() + REGISTRATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    return {
      code,
      codeHash,
      expiresAt,
      sentAt,
    };
  }

  private generateRegistrationCode(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // Email delivery is intentionally isolated from persistence so failed sends do not produce partial user creation.
  private async sendRegistrationVerification(
    pendingUser: PendingUser,
    code: string
  ): Promise<Result<void, Error>> {
    try {
      const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      // The resume token is signed so query-parameter tampering is rejected server-side.
      const resumeToken = this.tokenService.generateResumeRegistrationToken({
        sessionId: pendingUser.registrationSessionId,
        email: pendingUser.email,
        tokenVersion: pendingUser.tokenVersion,
      });
      const resumeUrl = `${appUrl}/register?email=${encodeURIComponent(
        pendingUser.email
      )}&resumeToken=${encodeURIComponent(resumeToken)}`;
      const result = await this.emailService.sendRegistrationVerificationEmail({
        to: pendingUser.email,
        userName: 'there',
        verificationCode: code,
        resumeUrl,
        expiresInMinutes: REGISTRATION_CODE_EXPIRY_MINUTES,
      });

      if (!result.success) {
        return Result.err(
          new AppError(
            'We could not send your verification code. Please try again.',
            503,
            'EMAIL_SEND_FAILED'
          )
        );
      }

      return Result.ok(undefined);
    } catch {
      return Result.err(
        new AppError(
          'We could not send your verification code. Please try again.',
          503,
          'EMAIL_SEND_FAILED'
        )
      );
    }
  }

  private toRegistrationChallengeResponse(
    email: string,
    registrationSessionId: string,
    expiresAt: Date
  ): RegistrationChallengeResponse {
    return {
      email,
      registrationSessionId,
      verificationRequired: true,
      verificationExpiresAt: expiresAt.toISOString(),
    };
  }

  private toGenericRegistrationChallengeResponse(email: string): RegistrationChallengeResponse {
    return {
      email,
      registrationSessionId: randomUUID(),
      verificationRequired: true,
      verificationExpiresAt: new Date(
        Date.now() + REGISTRATION_CODE_EXPIRY_MINUTES * 60 * 1000
      ).toISOString(),
    };
  }

  private invalidRegistrationSessionError(): Error {
    return new UnauthorizedError(GENERIC_REGISTRATION_SESSION_ERROR);
  }

  private invalidVerificationError(): Error {
    return new ValidationError(GENERIC_VERIFICATION_ERROR);
  }

  private async expirePendingUserIfNeeded(pendingUser: PendingUser): Promise<PendingUser> {
    if (pendingUser.status !== 'email_sent') {
      return pendingUser;
    }

    if (pendingUser.codeExpiresAt.getTime() >= Date.now()) {
      return pendingUser;
    }

    return this.pendingUserRepository.update(pendingUser.id, {
      status: 'expired',
    });
  }
}


```

## backend-node/src/api/routes/auth.routes.ts

```ts
import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IAuthUseCase } from '../../application/use-cases/AuthUseCase';
import {
  RegisterDto,
  LoginDto,
  ResumeRegistrationDto,
  VerifyRegistrationCodeDto,
  ResendRegistrationCodeDto,
  CompleteRegistrationDto,
} from '../../application/dtos/auth.dto';
import { authRateLimit } from '../middleware/rateLimitMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { ISuperAdminRepository } from '../../application/interfaces/ISuperAdminRepository';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { IOrgUseCase } from '../../application/use-cases/OrgUseCase';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { IJoinCodeRepository } from '../../application/interfaces/IJoinCodeRepository';
import { EmailService } from '../../infrastructure/email/email.service';

const router: ReturnType<typeof Router> = Router();

const handleVerifyRegistration = async (req: Request, res: Response, next: (error?: unknown) => void) => {
  try {
    const input = VerifyRegistrationCodeDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.verifyRegistrationCode(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    next(error);
  }
};

const handleResumeRegistration = async (req: Request, res: Response, next: (error?: unknown) => void) => {
  try {
    const input = ResumeRegistrationDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.resumeRegistration(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    next(error);
  }
};

const handleResendRegistrationCode = async (
  req: Request,
  res: Response,
  next: (error?: unknown) => void
) => {
  try {
    const input = ResendRegistrationCodeDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.resendRegistrationCode(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    next(error);
  }
};

router.post(
  '/register',
  authRateLimit,
  async (req: Request, res: Response, next) => {
    try {
      const secret = typeof req.query.secret === 'string' ? req.query.secret : undefined;
      const input = RegisterDto.parse({ ...req.body, secret });
      const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

      const result = await authUseCase.register(input);

      if (result.isErr()) {
        return next(result.unwrap());
      }

      const challenge = result.unwrap();

      res.status(201).json({
        success: true,
        data: challenge,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/verify-registration', authRateLimit, handleVerifyRegistration);
router.post('/verify', authRateLimit, handleVerifyRegistration);
router.post('/resume-registration', authRateLimit, handleResumeRegistration);

router.post('/resend-registration-code', authRateLimit, handleResendRegistrationCode);
router.post('/resend-code', authRateLimit, handleResendRegistrationCode);

router.post('/complete-registration', authRateLimit, async (req: Request, res: Response, next) => {
  try {
    const input = CompleteRegistrationDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.completeRegistration(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const { user, accessToken } = result.unwrap();

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authRateLimit, async (req: Request, res: Response, next) => {
  try {
    const input = LoginDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.login(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const { user, accessToken } = result.unwrap();

    // Send login success email (non-blocking, controlled by IS_EMAIL_LOGIN env var)
    const isEmailLoginEnabled = process.env.IS_EMAIL_LOGIN === 'true';
    if (isEmailLoginEnabled) {
      try {
        const emailService = new EmailService();
        const loginTime = new Date().toLocaleString('en-US', {
          timeZone: 'UTC',
          dateStyle: 'full',
          timeStyle: 'long',
        });
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await emailService.sendLoginSuccessEmail({
          to: user.email,
          userName: user.name || 'there',
          loginTime,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        });

        if (result.success) {
          console.log(`[Login] âœ… Login success email sent to ${user.email}`);
        } else {
          console.log(`[Login] âŒ Login success email NOT sent to ${user.email}: ${result.message}`);
        }
      } catch (emailError) {
        // Log error but don't block login
        console.error('[Login] âŒ Failed to send login success email:', emailError);
      }
    } else {
      console.log('[Login] âš ï¸ Login email NOT sent: IS_EMAIL_LOGIN is not enabled');
    }

    res.json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/bootstrap
 * 
 * Lightweight bootstrap endpoint used immediately after login.
 * Returns:
 * - user profile (id, email, name)
 * - minimal org list for the authenticated user
 * - activeOrgId heuristic based on org count
 * 
 * This allows the frontend to prime AuthSessionProvider and OrgSessionProvider
 * without issuing separate /auth/me and /orgs calls on the critical post-login path.
 */
router.get('/bootstrap', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);

    const dbUser = await userRepository.findById(req.user!.userId);

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    const orgResult = await orgUseCase.findByUserId(dbUser.id);
    if (orgResult.isErr()) {
      return next(orgResult.unwrap());
    }

    const orgs = orgResult.unwrap().map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      isActive: org.isActive,
      createdAt: org.createdAt.toISOString(),
      // Roles are resolved separately in orgsApi.list; for bootstrap we keep
      // this minimal and allow OrgSessionProvider to refresh later.
      roles: [] as string[],
    }));

    // Heuristic for activeOrgId:
    // - 0 orgs  -> null  (user will land on /orgs onboarding)
    // - 1 org   -> that org
    // - >1 org  -> null (let OrgSessionProvider / UI ask user to choose)
    let activeOrgId: string | null = null;
    if (orgs.length === 1) {
      activeOrgId = orgs[0].id;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
        },
        orgs,
        activeOrgId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint - disabled for MVP (Bearer-only)
// TODO: Re-enable with refreshToken in request body when needed
router.post('/refresh', async (req: Request, res: Response) => {
  return res.status(501).json({
    success: false,
    error: { message: 'Refresh token endpoint disabled for MVP', code: 'NOT_IMPLEMENTED' },
  });
});

router.post('/logout', (_req: Request, res: Response) => {
  // No cookie clearing needed for Bearer-only auth
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const user = await userRepository.findById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const userId = req.user!.userId;

    // Only allow updating name (email should not be changed)
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name is required', code: 'VALIDATION_ERROR' },
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name must be 255 characters or less', code: 'VALIDATION_ERROR' },
      });
    }

    const updatedUser = await userRepository.update(userId, { name: name.trim() });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Lightweight /auth/me/full endpoint - returns user, isSuperAdmin, org (with permissions), and installed apps
// Skips available apps (fetch separately, cache aggressively)
// Optional orgId query param - if provided, includes org data and installed apps
router.get('/me/full', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string | undefined;

    // Resolve repositories and use cases
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const superAdminRepo = container.resolve<ISuperAdminRepository>(TYPES.ISuperAdminRepository);
    
    // Get user data
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    // Get super admin status
    const superAdmin = await superAdminRepo.findByUserId(userId);
    const isSuperAdmin = superAdmin !== null && superAdmin.isActive;

    // Base response
    const responseData: any = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isSuperAdmin,
      org: null,
      permissions: null,
    };

    // If orgId provided, fetch org data, permissions, and installed apps
    if (orgId) {
      const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
      const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
      const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository);
      const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);
      const joinCodeRepo = container.resolve<IJoinCodeRepository>(TYPES.IJoinCodeRepository);

      // Get org data
      const orgResult = await orgUseCase.findById(orgId);
      if (orgResult.isOk()) {
        const org = orgResult.unwrap();
        
        // Get join code if exists
        const joinCode = await joinCodeRepo.findByOrgId(orgId);

        // Get user's roles in this org
        const orgUser = await orgUserRepo.findByOrgIdAndUserId(org.id, userId);
        let roles: string[] = [];
        if (orgUser) {
          const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
          const roleIds = orgUserRoles.map((our) => our.roleId);
          const roleObjects = await Promise.all(
            roleIds.map((roleId) => roleRepo.findById(roleId))
          );
          roles = roleObjects.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name);
        }

        // Build org object with join code data
        responseData.org = {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          isActive: org.isActive,
          createdAt: org.createdAt,
          roles,
          // Join code fields
          joinCode: joinCode?.code || null,
          joinCodeMaxUses: joinCode?.maxUses || null,
          joinCodeUsedCount: joinCode?.usedCount || 0,
          joinCodeAllowedDomains: joinCode?.allowedDomains || null,
          joinCodeIsActive: joinCode?.isActive || false,
          joinCodeExpiresAt: joinCode?.expiresAt ? joinCode.expiresAt.toISOString() : null,
          joinCodeDefaultRoleId: joinCode?.defaultRoleId || null,
        };

        // Build permissions
        responseData.permissions = {
          isAdmin: roles.some((role: string) => role.toLowerCase() === 'admin'),
          isMember: roles.length > 0,
          roles,
        };
      }
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;


```

## backend-node/drizzle/0020_harden_pending_user_sessions.sql

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'pending_user_status'
  ) THEN
    CREATE TYPE "pending_user_status" AS ENUM (
      'email_sent',
      'verified',
      'completed',
      'expired',
      'locked',
      'superseded'
    );
  END IF;
END $$;

ALTER TABLE "pending_users"
  ADD COLUMN IF NOT EXISTS "registration_session_id" UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "status" "pending_user_status" DEFAULT 'email_sent',
  ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

UPDATE "pending_users"
SET
  "registration_session_id" = COALESCE("registration_session_id", gen_random_uuid()),
  "status" = CASE
    WHEN "completed_at" IS NOT NULL THEN 'completed'::pending_user_status
    WHEN "verified_at" IS NOT NULL THEN 'verified'::pending_user_status
    ELSE 'email_sent'::pending_user_status
  END,
  "token_version" = COALESCE("token_version", 1)
WHERE
  "registration_session_id" IS NULL
  OR "status" IS NULL;

ALTER TABLE "pending_users"
  ALTER COLUMN "registration_session_id" SET NOT NULL,
  ALTER COLUMN "status" SET NOT NULL;

DROP INDEX IF EXISTS "pending_users_email_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "pending_users_session_unique"
  ON "pending_users" ("registration_session_id");

CREATE INDEX IF NOT EXISTS "pending_users_email_idx"
  ON "pending_users" ("email");

CREATE INDEX IF NOT EXISTS "pending_users_status_idx"
  ON "pending_users" ("status");
```

## frontend/lib/api/auth.ts

```ts
import apiClient from './client';
import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  name: string;
}

// Zod schemas for form validation
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const CompleteRegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CompleteRegistrationInput = z.infer<typeof CompleteRegistrationSchema>;

export interface RegistrationChallengeResponse {
  email: string;
  registrationSessionId: string | null;
  verificationRequired: true;
  verificationExpiresAt: string | null;
}

export interface ResumeRegistrationResponse {
  email: string;
  registrationSessionId: string;
  verificationRequired: true;
  verificationExpiresAt: string;
}

export interface RegistrationVerificationResponse {
  email: string;
  registrationSessionId: string;
  verified: true;
  setupToken: string;
}

export interface AuthFullResponse {
  user: User;
  isSuperAdmin: boolean;
  org: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    roles: string[];
    joinCode?: string | null;
    joinCodeMaxUses?: number | null;
    joinCodeUsedCount?: number;
    joinCodeAllowedDomains?: string[] | null;
    joinCodeIsActive?: boolean;
    joinCodeExpiresAt?: string | null;
    joinCodeDefaultRoleId?: number | null;
  } | null;
  permissions: {
    isAdmin: boolean;
    isMember: boolean;
    roles: string[];
  } | null;
  installedApps: never[];
}

export interface AuthBootstrapOrg {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface AuthBootstrapResponse {
  user: User;
  orgs: AuthBootstrapOrg[];
  activeOrgId: string | null;
}

import { tokenStorage } from './token';

const DEBUG_AUTH = true;

export const authApi = {
  login: async (input: LoginInput): Promise<{ success: boolean; data: { user: User; accessToken: string } }> => {
    const response = await apiClient.post('/auth/login', input);
    const data = response.data;
    
    if (DEBUG_AUTH) {
      console.log('[AuthAPI] Login response:', data);
      console.log('[AuthAPI] AccessToken present:', !!data.data?.accessToken);
    }
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);
      
      if (DEBUG_AUTH) {
        const storedToken = tokenStorage.getToken();
        console.log('[AuthAPI] Token stored successfully:', !!storedToken);
        console.log('[AuthAPI] Token length:', storedToken?.length || 0);
      }
    } else {
      if (DEBUG_AUTH) {
        console.error('[AuthAPI] Token NOT stored - response structure issue');
        console.error('[AuthAPI] Response structure:', {
          success: data.success,
          hasData: !!data.data,
          hasAccessToken: !!data.data?.accessToken,
        });
      }
    }
    
    return data;
  },

  /**
   * Bootstrap authenticated session (user + orgs + activeOrgId).
   * 
   * Used immediately after login to prime AuthSessionProvider and OrgSessionProvider
   * without issuing separate /auth/me and /orgs calls on the critical path.
   */
  bootstrap: async (): Promise<{ success: boolean; data: AuthBootstrapResponse }> => {
    const response = await apiClient.get('/auth/bootstrap');
    return response.data;
  },

  register: async (
    input: RegisterInput,
    secret?: string
  ): Promise<{ success: boolean; data: RegistrationChallengeResponse }> => {
    const query = secret ? `?secret=${encodeURIComponent(secret)}` : '';
    const response = await apiClient.post(`/auth/register${query}`, input);
    return response.data;
  },

  resumeRegistration: async (
    resumeToken: string
  ): Promise<{ success: boolean; data: ResumeRegistrationResponse }> => {
    const response = await apiClient.post('/auth/resume-registration', { resumeToken });
    return response.data;
  },

  verifyRegistration: async (
    input: { registrationSessionId: string; email: string; code: string }
  ): Promise<{ success: boolean; data: RegistrationVerificationResponse }> => {
    const response = await apiClient.post('/auth/verify-registration', input);
    return response.data;
  },

  resendRegistrationCode: async (
    input: { registrationSessionId: string; email: string }
  ): Promise<{ success: boolean; data: RegistrationChallengeResponse }> => {
    const response = await apiClient.post('/auth/resend-registration-code', input);
    return response.data;
  },

  completeRegistration: async (
    input: Omit<CompleteRegistrationInput, 'confirmPassword'> & {
      registrationSessionId: string;
      setupToken: string;
    }
  ): Promise<{ success: boolean; data: { user: User; accessToken: string } }> => {
    const response = await apiClient.post('/auth/complete-registration', input);
    const data = response.data;

    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);
    }

    return data;
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getMeFull: async (orgId?: string): Promise<{ success: boolean; data: AuthFullResponse }> => {
    const params = orgId ? { orgId } : {};
    const response = await apiClient.get('/auth/me/full', { params });
    return response.data;
  },

  updateMe: async (name: string): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.patch('/auth/me', { name });
      return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear token first
    tokenStorage.clearToken();
    // Call logout endpoint (non-blocking)
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore errors - token is already cleared
    }
  },

  refresh: async (): Promise<{ success: boolean; data: { user: User } }> => {
    // Refresh disabled for MVP
    throw new Error('Token refresh not implemented');
  },
};

```

## frontend/app/(auth)/register/page.tsx

```tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, RegisterSchema, type RegisterInput } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [secret, setSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const secretParam = searchParams.get('secret');
    setSecret(secretParam || undefined);
  }, [searchParams]);

  useEffect(() => {
    const resumeToken = searchParams.get('resumeToken');
    if (!resumeToken) {
      return;
    }

    let cancelled = false;

    const resumeRegistration = async () => {
      setResuming(true);
      setError(null);

      try {
        const response = await authApi.resumeRegistration(resumeToken);
        if (cancelled) {
          return;
        }

        router.replace(
          `/verify?email=${encodeURIComponent(response.data.email)}&registrationSessionId=${encodeURIComponent(
            response.data.registrationSessionId
          )}`
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Could not restore registration');
        }
      } finally {
        if (!cancelled) {
          setResuming(false);
        }
      }
    };

    void resumeRegistration();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.register(data, secret);
      const email = response.data.email || data.email;
      const registrationSessionId = response.data.registrationSessionId;
      router.push(
        `/verify?email=${encodeURIComponent(email)}&registrationSessionId=${encodeURIComponent(
          registrationSessionId || ''
        )}`
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Checking authentication...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resuming) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Restoring registration...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Redirecting...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <AmbientBackground
        gridSize={64}
        lightCount={0}
        enableGrain={false}
        gradientOpacity={0.08}
      />

      <main className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">
          <div className="relative">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.072), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/75 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <AirunoteLogo
                    href="/"
                    iconSize={46}
                    className="inline-flex flex-col items-center gap-2"
                    textClassName="text-sm font-semibold tracking-tight text-gray-700"
                  />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Create your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Enter your email and we&apos;ll send an 8-digit verification code.
                </p>
              </div>

              {secret && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Invite mode is active for this link. Your access key is already attached.
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    autoComplete="email"
                    placeholder="Email"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Sending code...' : 'Continue'}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200/90 pt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}


```

## frontend/app/(auth)/verify/page.tsx

```tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';

const VerifySchema = z.object({
  code: z.string().regex(/^\d{8}$/, 'Enter the 8-digit verification code'),
});

type VerifyInput = z.infer<typeof VerifySchema>;
const setupTokenStorageKey = (registrationSessionId: string) =>
  `airunote_registration_setup_token:${registrationSessionId}`;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);
  const registrationSessionId = useMemo(
    () => searchParams.get('registrationSessionId')?.trim() || '',
    [searchParams]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyInput>({
    resolver: zodResolver(VerifySchema),
  });

  const onSubmit = async (data: VerifyInput) => {
    if (!email || !registrationSessionId) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await authApi.verifyRegistration({
        registrationSessionId,
        email,
        code: data.code,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          setupTokenStorageKey(response.data.registrationSessionId),
          response.data.setupToken
        );
      }
      router.push(
        `/complete-registration?email=${encodeURIComponent(email)}&registrationSessionId=${encodeURIComponent(
          registrationSessionId
        )}`
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !registrationSessionId) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setResending(true);
    setError(null);
    setInfo(null);

    try {
      await authApi.resendRegistrationCode({ registrationSessionId, email });
      setInfo(`A new 8-digit code was sent to ${email}.`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'We could not send your verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <AmbientBackground
        gridSize={64}
        lightCount={0}
        enableGrain={false}
        gradientOpacity={0.08}
      />
      <main className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">
          <div className="relative">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.072), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/75 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <AirunoteLogo
                    href="/"
                    iconSize={46}
                    className="inline-flex flex-col items-center gap-2"
                    textClassName="text-sm font-semibold tracking-tight text-gray-700"
                  />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Verify your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Enter the 8-digit code sent to {email || 'your email'}.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600">
                Need a fresh code? Use resend after lockout or expiration. Verification attempts are limited for security.
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {info && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {info}
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="sr-only">
                    Verification code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    placeholder="8-digit code"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.code && <p className="mt-2 text-sm text-red-600">{errors.code.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !registrationSessionId}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify and continue'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-200/90 pt-5 text-sm text-gray-500">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !email || !registrationSessionId}
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? 'Sending new code...' : 'Request new code'}
                </button>
                <Link
                  href="/login"
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
```

## frontend/app/(auth)/complete-registration/page.tsx

```tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  authApi,
  CompleteRegistrationSchema,
  type CompleteRegistrationInput,
} from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

const setupTokenStorageKey = (registrationSessionId: string) =>
  `airunote_registration_setup_token:${registrationSessionId}`;

function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, refetch } = useAuth();
  const orgSession = useOrgSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);
  const registrationSessionId = useMemo(
    () => searchParams.get('registrationSessionId')?.trim() || '',
    [searchParams]
  );

  useEffect(() => {
    if (!registrationSessionId || typeof window === 'undefined') {
      setSetupToken('');
      return;
    }

    const storedSetupToken = window.sessionStorage.getItem(
      setupTokenStorageKey(registrationSessionId)
    );
    setSetupToken(storedSetupToken || '');
  }, [registrationSessionId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && orgSession.status === 'ready') {
      if (orgSession.orgs.length === 0) {
        router.push('/orgs');
      } else if (orgSession.activeOrgId) {
        router.push(`/orgs/${orgSession.activeOrgId}/airunote`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, orgSession.status, orgSession.orgs.length, orgSession.activeOrgId, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteRegistrationInput>({
    resolver: zodResolver(CompleteRegistrationSchema),
    values: {
      email,
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const finishAuthenticatedRedirect = async () => {
    const bootstrapResponse = await authApi.bootstrap();

    if (bootstrapResponse.success && typeof window !== 'undefined') {
      const { user, orgs, activeOrgId } = bootstrapResponse.data;
      window.sessionStorage.setItem('airunote_bootstrap_user', JSON.stringify(user));
      window.sessionStorage.setItem(
        'airunote_bootstrap_orgs',
        JSON.stringify({ orgs, activeOrgId })
      );

      await refetch();

      if (orgs.length === 0) {
        router.push('/orgs');
      } else if (activeOrgId) {
        router.push(`/orgs/${activeOrgId}/airunote`);
      } else {
        router.push('/orgs');
      }
      return;
    }

    router.push('/dashboard');
  };

  const onSubmit = async (data: CompleteRegistrationInput) => {
    if (!email || !registrationSessionId || !setupToken) {
      setError('Missing verification email. Start registration again to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.completeRegistration({
        registrationSessionId,
        setupToken,
        email,
        name: data.name,
        password: data.password,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(setupTokenStorageKey(registrationSessionId));
      }
      await finishAuthenticatedRedirect();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not complete registration');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Checking authentication...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <AmbientBackground
        gridSize={64}
        lightCount={0}
        enableGrain={false}
        gradientOpacity={0.08}
      />

      <main className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">
          <div className="relative">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.072), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/75 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <AirunoteLogo
                    href="/"
                    iconSize={46}
                    className="inline-flex flex-col items-center gap-2"
                    textClassName="text-sm font-semibold tracking-tight text-gray-700"
                  />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Complete your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Set your name and password for {email || 'your email'}.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-500"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="name" className="sr-only">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="Name"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    placeholder="Password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm password
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !registrationSessionId || !setupToken}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Completing registration...' : 'Continue'}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200/90 pt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <CompleteRegistrationForm />
    </Suspense>
  );
}
```

## backend-node/tests/unit/auth/AuthUseCase.pending-registration.test.ts

```ts
import 'reflect-metadata';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { AuthUseCase } from '../../../src/application/use-cases/AuthUseCase';
import { IUserRepository } from '../../../src/application/interfaces/IUserRepository';
import {
  IPendingUserRepository,
  PendingUserCompletionResult,
  PendingUserVerificationResult,
} from '../../../src/application/interfaces/IPendingUserRepository';
import { IAppSettingRepository } from '../../../src/application/interfaces/IAppSettingRepository';
import { IPasswordHasherService } from '../../../src/infrastructure/services/PasswordHasherService';
import { ITokenService } from '../../../src/infrastructure/services/TokenService';
import { IEmailService } from '../../../src/infrastructure/email/email.service';
import { User } from '../../../src/domain/entities/User';
import { PendingUser } from '../../../src/domain/entities/PendingUser';

class InMemoryUserRepository implements IUserRepository {
  public readonly users = new Map<string, User>();
  private nextId = 1;

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const created = new User(
      `user-${this.nextId++}`,
      user.email,
      user.passwordHash,
      user.name,
      user.isActive,
      user.defaultOrgId,
      user.emailVerifiedAt,
      user.registrationMfaCodeHash,
      user.registrationMfaExpiresAt,
      user.registrationMfaAttemptCount,
      user.registrationMfaLastSentAt,
      new Date()
    );
    this.users.set(created.email, created);
    return created;
  }

  async findById(id: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) || null;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const existing = [...this.users.values()].find((user) => user.id === id);
    if (!existing) {
      throw new Error('User not found');
    }

    const updated = new User(
      existing.id,
      updates.email ?? existing.email,
      updates.passwordHash ?? existing.passwordHash,
      updates.name ?? existing.name,
      updates.isActive ?? existing.isActive,
      updates.defaultOrgId ?? existing.defaultOrgId,
      updates.emailVerifiedAt ?? existing.emailVerifiedAt,
      updates.registrationMfaCodeHash ?? existing.registrationMfaCodeHash,
      updates.registrationMfaExpiresAt ?? existing.registrationMfaExpiresAt,
      updates.registrationMfaAttemptCount ?? existing.registrationMfaAttemptCount,
      updates.registrationMfaLastSentAt ?? existing.registrationMfaLastSentAt,
      existing.createdAt
    );

    this.users.delete(existing.email);
    this.users.set(updated.email, updated);
    return updated;
  }
}

class InMemoryPendingUserRepository implements IPendingUserRepository {
  public readonly pendingUsers = new Map<string, PendingUser>();
  private nextId = 1;

  constructor(private readonly userRepository: InMemoryUserRepository) {}

  async createRegistrationSession(
    pendingUser: Omit<PendingUser, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PendingUser> {
    const now = new Date();
    const record = new PendingUser(
      `pending-${this.nextId++}`,
      pendingUser.registrationSessionId,
      pendingUser.email,
      pendingUser.verificationCodeHash,
      pendingUser.codeExpiresAt,
      pendingUser.attempts,
      pendingUser.lastSentAt,
      pendingUser.verifiedAt,
      pendingUser.completedAt,
      pendingUser.status,
      pendingUser.tokenVersion,
      now,
      now
    );

    this.pendingUsers.set(record.registrationSessionId, record);
    return record;
  }

  async findByEmail(email: string): Promise<PendingUser | null> {
    return (
      [...this.pendingUsers.values()]
        .filter((pendingUser) => pendingUser.email === email)
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] || null
    );
  }

  async findByRegistrationSessionId(registrationSessionId: string): Promise<PendingUser | null> {
    return this.pendingUsers.get(registrationSessionId) || null;
  }

  async findActiveByEmail(email: string): Promise<PendingUser | null> {
    return (
      [...this.pendingUsers.values()]
        .filter(
          (pendingUser) =>
            pendingUser.email === email &&
            (pendingUser.status === 'email_sent' || pendingUser.status === 'verified')
        )
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] || null
    );
  }

  async supersedeActiveByEmail(email: string): Promise<void> {
    for (const pendingUser of this.pendingUsers.values()) {
      if (
        pendingUser.email === email &&
        pendingUser.status !== 'completed' &&
        pendingUser.status !== 'superseded'
      ) {
        this.pendingUsers.set(
          pendingUser.registrationSessionId,
          new PendingUser(
            pendingUser.id,
            pendingUser.registrationSessionId,
            pendingUser.email,
            pendingUser.verificationCodeHash,
            pendingUser.codeExpiresAt,
            pendingUser.attempts,
            pendingUser.lastSentAt,
            pendingUser.verifiedAt,
            pendingUser.completedAt,
            'superseded',
            pendingUser.tokenVersion,
            pendingUser.createdAt,
            new Date()
          )
        );
      }
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<PendingUser, 'id' | 'createdAt'>>
  ): Promise<PendingUser> {
    const existing = [...this.pendingUsers.values()].find((pendingUser) => pendingUser.id === id);
    if (!existing) {
      throw new Error('Pending user not found');
    }

    const updated = new PendingUser(
      existing.id,
      updates.registrationSessionId ?? existing.registrationSessionId,
      updates.email ?? existing.email,
      updates.verificationCodeHash ?? existing.verificationCodeHash,
      updates.codeExpiresAt ?? existing.codeExpiresAt,
      updates.attempts ?? existing.attempts,
      updates.lastSentAt ?? existing.lastSentAt,
      updates.verifiedAt ?? existing.verifiedAt,
      updates.completedAt ?? existing.completedAt,
      updates.status ?? existing.status,
      updates.tokenVersion ?? existing.tokenVersion,
      existing.createdAt,
      updates.updatedAt ?? new Date()
    );

    this.pendingUsers.delete(existing.registrationSessionId);
    this.pendingUsers.set(updated.registrationSessionId, updated);
    return updated;
  }

  async verifyCode(input: {
    registrationSessionId: string;
    email: string;
    code: string;
    maxAttempts: number;
    verifyCode: (code: string, hash: string) => Promise<boolean>;
  }): Promise<PendingUserVerificationResult> {
    const pendingUser = this.pendingUsers.get(input.registrationSessionId);
    if (!pendingUser) {
      return { status: 'not-found' };
    }

    if (pendingUser.status !== 'email_sent') {
      return { status: 'invalid-state' };
    }

    if (pendingUser.attempts >= input.maxAttempts) {
      this.pendingUsers.set(
        pendingUser.registrationSessionId,
        new PendingUser(
          pendingUser.id,
          pendingUser.registrationSessionId,
          pendingUser.email,
          pendingUser.verificationCodeHash,
          pendingUser.codeExpiresAt,
          pendingUser.attempts,
          pendingUser.lastSentAt,
          pendingUser.verifiedAt,
          pendingUser.completedAt,
          'locked',
          pendingUser.tokenVersion,
          pendingUser.createdAt,
          new Date()
        )
      );
      return { status: 'too-many-attempts' };
    }

    if (pendingUser.codeExpiresAt.getTime() < Date.now()) {
      this.pendingUsers.set(
        pendingUser.registrationSessionId,
        new PendingUser(
          pendingUser.id,
          pendingUser.registrationSessionId,
          pendingUser.email,
          pendingUser.verificationCodeHash,
          pendingUser.codeExpiresAt,
          pendingUser.attempts,
          pendingUser.lastSentAt,
          pendingUser.verifiedAt,
          pendingUser.completedAt,
          'expired',
          pendingUser.tokenVersion,
          pendingUser.createdAt,
          new Date()
        )
      );
      return { status: 'expired' };
    }

    if (pendingUser.email !== input.email) {
      return { status: 'email-mismatch' };
    }

    const isValidCode = await input.verifyCode(input.code, pendingUser.verificationCodeHash);
    if (!isValidCode) {
      const attempts = pendingUser.attempts + 1;
      this.pendingUsers.set(
        pendingUser.registrationSessionId,
        new PendingUser(
          pendingUser.id,
          pendingUser.registrationSessionId,
          pendingUser.email,
          pendingUser.verificationCodeHash,
          pendingUser.codeExpiresAt,
          attempts,
          pendingUser.lastSentAt,
          pendingUser.verifiedAt,
          pendingUser.completedAt,
          attempts >= input.maxAttempts ? 'locked' : pendingUser.status,
          pendingUser.tokenVersion,
          pendingUser.createdAt,
          new Date()
        )
      );

      if (attempts >= input.maxAttempts) {
        return { status: 'too-many-attempts' };
      }

      return { status: 'invalid-code', attempts };
    }

    const verifiedPendingUser = new PendingUser(
      pendingUser.id,
      pendingUser.registrationSessionId,
      pendingUser.email,
      pendingUser.verificationCodeHash,
      pendingUser.codeExpiresAt,
      0,
      pendingUser.lastSentAt,
      new Date(),
      pendingUser.completedAt,
      'verified',
      pendingUser.tokenVersion,
      pendingUser.createdAt,
      new Date()
    );

    this.pendingUsers.set(pendingUser.registrationSessionId, verifiedPendingUser);
    return { status: 'verified', pendingUser: verifiedPendingUser };
  }

  async completeRegistration(input: {
    registrationSessionId: string;
    email: string;
    name: string;
    passwordHash: string;
    tokenVersion: number;
  }): Promise<PendingUserCompletionResult> {
    const pendingUser = this.pendingUsers.get(input.registrationSessionId);
    if (!pendingUser) {
      return { status: 'not-found' };
    }

    if (pendingUser.status !== 'verified') {
      return { status: 'invalid-state' };
    }

    if (pendingUser.email !== input.email) {
      return { status: 'email-mismatch' };
    }

    if (pendingUser.tokenVersion !== input.tokenVersion) {
      return { status: 'token-version-mismatch' };
    }

    if (await this.userRepository.findByEmail(input.email)) {
      return { status: 'user-exists' };
    }

    const user = await this.userRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      isActive: true,
      defaultOrgId: null,
      emailVerifiedAt: pendingUser.verifiedAt,
      registrationMfaCodeHash: null,
      registrationMfaExpiresAt: null,
      registrationMfaAttemptCount: 0,
      registrationMfaLastSentAt: null,
    });

    this.pendingUsers.set(
      pendingUser.registrationSessionId,
      new PendingUser(
        pendingUser.id,
        pendingUser.registrationSessionId,
        pendingUser.email,
        pendingUser.verificationCodeHash,
        pendingUser.codeExpiresAt,
        pendingUser.attempts,
        pendingUser.lastSentAt,
        pendingUser.verifiedAt,
        new Date(),
        'completed',
        pendingUser.tokenVersion,
        pendingUser.createdAt,
        new Date()
      )
    );

    return { status: 'created', user };
  }
}

class FakeAppSettingRepository implements IAppSettingRepository {
  async findByKey(): Promise<string | null> {
    return null;
  }

  async upsert(): Promise<void> {
    return undefined;
  }
}

class FakePasswordHasher implements IPasswordHasherService {
  async hash(password: string): Promise<string> {
    return `hash:${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hash:${password}`;
  }
}

class FakeTokenService implements ITokenService {
  generateAccessToken(payload: { userId: string; email: string }): string {
    return `access:${payload.userId}`;
  }

  generateRefreshToken(payload: { userId: string; email: string }): string {
    return `refresh:${payload.userId}`;
  }

  generateResumeRegistrationToken(payload: {
    sessionId: string;
    email: string;
    tokenVersion: number;
  }): string {
    return `resume:${payload.sessionId}:${payload.email}:${payload.tokenVersion}`;
  }

  generateSetupRegistrationToken(payload: {
    sessionId: string;
    email: string;
    tokenVersion: number;
  }): string {
    return `setup:${payload.sessionId}:${payload.email}:${payload.tokenVersion}`;
  }

  verifyAccessToken(): { userId: string; email: string } | null {
    return null;
  }

  verifyRefreshToken(): { userId: string; email: string } | null {
    return null;
  }

  verifyResumeRegistrationToken(token: string) {
    const [, sessionId, email, tokenVersion] = token.split(':');
    if (!sessionId || !email || !tokenVersion) {
      return null;
    }

    return {
      purpose: 'resume-registration' as const,
      sessionId,
      email,
      tokenVersion: Number(tokenVersion),
    };
  }

  verifySetupRegistrationToken(token: string) {
    const [, sessionId, email, tokenVersion] = token.split(':');
    if (!sessionId || !email || !tokenVersion) {
      return null;
    }

    return {
      purpose: 'complete-registration' as const,
      sessionId,
      email,
      tokenVersion: Number(tokenVersion),
    };
  }
}

class FakeEmailService implements IEmailService {
  async sendOrgCreatedEmail(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'ok' };
  }

  async sendLoginSuccessEmail(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'ok' };
  }

  async sendRegistrationVerificationEmail(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'ok' };
  }
}

describe('AuthUseCase pending registration flow', () => {
  let userRepository: InMemoryUserRepository;
  let pendingUserRepository: InMemoryPendingUserRepository;
  let authUseCase: AuthUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    pendingUserRepository = new InMemoryPendingUserRepository(userRepository);
    authUseCase = new AuthUseCase(
      userRepository,
      pendingUserRepository,
      new FakeAppSettingRepository(),
      new FakePasswordHasher(),
      new FakeTokenService(),
      new FakeEmailService()
    );
  });

  it('stores pending registrations without creating a user record', async () => {
    const result = await authUseCase.register({
      email: 'ada@example.com',
    });

    expect(result.isOk()).toBe(true);
    expect(await userRepository.findByEmail('ada@example.com')).toBeNull();
    expect(result.unwrap().registrationSessionId).toBeTruthy();
    expect(await pendingUserRepository.findActiveByEmail('ada@example.com')).not.toBeNull();
  });

  it('supersedes an older session and only the latest session can verify', async () => {
    const firstResult = await authUseCase.register({
      email: 'ada@example.com',
    });

    const firstPendingUser = await pendingUserRepository.findByRegistrationSessionId(
      firstResult.unwrap().registrationSessionId!
    );
    const firstCode = firstPendingUser!.verificationCodeHash.replace('hash:', '');

    await pendingUserRepository.update(firstPendingUser!.id, {
      lastSentAt: new Date(Date.now() - 61_000),
    });

    await authUseCase.register({
      email: 'ada@example.com',
    });

    const latestPendingUser = await pendingUserRepository.findActiveByEmail('ada@example.com');
    const latestCode = latestPendingUser!.verificationCodeHash.replace('hash:', '');

    const oldCodeResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: firstPendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code: firstCode,
    });

    expect(oldCodeResult.isErr()).toBe(true);
    expect((oldCodeResult as { error: Error }).error.message).toBe(
      'Invalid or expired verification code. Request a new code and try again.'
    );

    const latestCodeResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: latestPendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code: latestCode,
    });

    expect(latestCodeResult.isOk()).toBe(true);
    expect(await userRepository.findByEmail('ada@example.com')).toBeNull();
    expect((await pendingUserRepository.findActiveByEmail('ada@example.com'))?.verifiedAt).not.toBeNull();
  });

  it('enforces a resend cooldown for pending registrations', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    });

    const result = await authUseCase.resendRegistrationCode({
      registrationSessionId: registerResult.unwrap().registrationSessionId!,
      email: 'ada@example.com',
    });

    expect(result.isErr()).toBe(true);
    expect((result as { error: { code?: string; message: string } }).error.code).toBe('RESEND_COOLDOWN');
    expect((result as { error: Error }).error.message).toBe('Please wait before requesting a new code.');
  });

  it('locks verification after five invalid attempts', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    });

    for (let attempt = 1; attempt < 5; attempt += 1) {
      const result = await authUseCase.verifyRegistrationCode({
        registrationSessionId: registerResult.unwrap().registrationSessionId!,
        email: 'ada@example.com',
        code: '00000000',
      });

      expect(result.isErr()).toBe(true);
      expect((result as { error: Error }).error.message).toBe(
        'Invalid or expired verification code. Request a new code and try again.'
      );
    }

    const lockedResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: registerResult.unwrap().registrationSessionId!,
      email: 'ada@example.com',
      code: '00000000',
    });

    expect(lockedResult.isErr()).toBe(true);
    expect((lockedResult as { error: Error }).error.message).toBe(
      'Invalid or expired verification code. Request a new code and try again.'
    );
  });

  it('creates the user only after complete registration', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    });

    const pendingUser = await pendingUserRepository.findByRegistrationSessionId(
      registerResult.unwrap().registrationSessionId!
    );
    const code = pendingUser!.verificationCodeHash.replace('hash:', '');

    const verificationResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: pendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code,
    });

    const completionResult = await authUseCase.completeRegistration({
      registrationSessionId: pendingUser!.registrationSessionId,
      setupToken: verificationResult.unwrap().setupToken,
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      password: 'password-123',
    });

    expect(completionResult.isOk()).toBe(true);
    expect(
      (await pendingUserRepository.findByRegistrationSessionId(pendingUser!.registrationSessionId))?.status
    ).toBe('completed');
    expect((await userRepository.findByEmail('ada@example.com'))?.name).toBe('Ada Lovelace');
  });

  it('resumes only with a valid signed resume token', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    });

    const resumeResult = await authUseCase.resumeRegistration({
      resumeToken: `resume:${registerResult.unwrap().registrationSessionId}:ada@example.com:1`,
    });

    expect(resumeResult.isOk()).toBe(true);
    expect(resumeResult.unwrap().registrationSessionId).toBe(
      registerResult.unwrap().registrationSessionId
    );
  });
});

```


# Registration Security Hardening Full Updated Files

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
    public readonly ipAddress: string | null,
    public readonly userAgentHash: string | null,
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
  | { status: 'device-mismatch'; attempts: number }
  | { status: 'invalid-code'; attempts: number }
  | { status: 'verified'; pendingUser: PendingUser };

export type PendingUserCompletionResult =
  | { status: 'created'; user: User }
  | { status: 'not-found' }
  | { status: 'invalid-state' }
  | { status: 'email-mismatch' }
  | { status: 'device-mismatch'; attempts: number }
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
    ipAddress: string | null;
    userAgentHash: string | null;
    code: string;
    maxAttempts: number;
    maxDeviceMismatches: number;
    verifyCode: (code: string, hash: string) => Promise<boolean>;
  }): Promise<PendingUserVerificationResult>;
  completeRegistration(input: {
    registrationSessionId: string;
    email: string;
    ipAddress: string | null;
    userAgentHash: string | null;
    name: string;
    passwordHash: string;
    tokenVersion: number;
    maxDeviceMismatches: number;
  }): Promise<PendingUserCompletionResult>;
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
  ipAddress: varchar('ip_address', { length: 255 }),
  userAgentHash: varchar('user_agent_hash', { length: 255 }),
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

## backend-node/drizzle/0021_bind_pending_sessions_to_device.sql

```sql
ALTER TABLE "pending_users"
  ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "user_agent_hash" VARCHAR(255);
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
        ipAddress: pendingUser.ipAddress,
        userAgentHash: pendingUser.userAgentHash,
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
    if (updates.ipAddress !== undefined) updateData.ipAddress = updates.ipAddress;
    if (updates.userAgentHash !== undefined) updateData.userAgentHash = updates.userAgentHash;
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
    ipAddress: string | null;
    userAgentHash: string | null;
    code: string;
    maxAttempts: number;
    maxDeviceMismatches: number;
    verifyCode: (code: string, hash: string) => Promise<boolean>;
  }): Promise<PendingUserVerificationResult> {
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT
          id,
          registration_session_id,
          email,
          ip_address,
          user_agent_hash,
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
        ip_address: string | null;
        user_agent_hash: string | null;
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
        record.ip_address,
        record.user_agent_hash,
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

      if (this.isDeviceBindingMismatch(pendingUser, input.ipAddress, input.userAgentHash)) {
        const attempts = Math.min(pendingUser.attempts + 1, input.maxAttempts);
        const shouldLock = attempts >= input.maxAttempts || attempts > input.maxDeviceMismatches;

        await tx
          .update(pendingUsersTable)
          .set({
            attempts,
            status: shouldLock ? 'locked' : pendingUser.status,
            updatedAt: new Date(),
          })
          .where(eq(pendingUsersTable.id, pendingUser.id));

        return { status: 'device-mismatch', attempts };
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
    ipAddress: string | null;
    userAgentHash: string | null;
    name: string;
    passwordHash: string;
    tokenVersion: number;
    maxDeviceMismatches: number;
  }): Promise<PendingUserCompletionResult> {
    // User creation and session completion happen in one transaction to prevent duplicate or half-finished registration state.
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT
          id,
          registration_session_id,
          email,
          ip_address,
          user_agent_hash,
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
        ip_address: string | null;
        user_agent_hash: string | null;
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

      const pendingUser = new PendingUser(
        record.id,
        record.registration_session_id,
        record.email,
        record.ip_address,
        record.user_agent_hash,
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

      if (this.isDeviceBindingMismatch(pendingUser, input.ipAddress, input.userAgentHash)) {
        const attempts = Math.min(record.attempts + 1, 5);
        const shouldLock = attempts > input.maxDeviceMismatches;

        await tx
          .update(pendingUsersTable)
          .set({
            attempts,
            status: shouldLock ? 'locked' : record.status,
            updatedAt: new Date(),
          })
          .where(eq(pendingUsersTable.id, record.id));

        return { status: 'device-mismatch', attempts };
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
      record.ipAddress,
      record.userAgentHash,
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

  private isDeviceBindingMismatch(
    pendingUser: PendingUser,
    ipAddress: string | null,
    userAgentHash: string | null
  ): boolean {
    return (
      pendingUser.ipAddress !== ipAddress ||
      pendingUser.userAgentHash !== userAgentHash
    );
  }
}
```

## backend-node/src/application/use-cases/AuthUseCase.ts

```ts
import { createHash, randomUUID } from 'crypto';
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
  register(input: RegisterInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationChallengeResponse, Error>>;
  resumeRegistration(input: ResumeRegistrationInput, requestContext?: RegistrationRequestContext): Promise<Result<ResumeRegistrationResponse, Error>>;
  verifyRegistrationCode(input: VerifyRegistrationCodeInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationVerificationResponse, Error>>;
  resendRegistrationCode(input: ResendRegistrationCodeInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationChallengeResponse, Error>>;
  completeRegistration(input: CompleteRegistrationInput, requestContext?: RegistrationRequestContext): Promise<Result<AuthResponse, Error>>;
  login(input: LoginInput): Promise<Result<AuthResponse, Error>>;
  refreshToken(refreshToken: string): Promise<Result<AuthResponse, Error>>;
}

interface RegistrationRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const REGISTRATION_CODE_EXPIRY_MINUTES = 10;
const MAX_REGISTRATION_CODE_ATTEMPTS = 5;
const MAX_DEVICE_MISMATCH_ATTEMPTS = 2;
const REGISTRATION_RESEND_COOLDOWN_MS = 60 * 1000;

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

  async register(
    input: RegisterInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const deviceBinding = this.toDeviceBinding(requestContext);
    this.logRegistrationAudit('REGISTER_ATTEMPT', {
      sessionId: null,
      email: normalizedEmail,
      ipAddress: deviceBinding.ipAddress,
      success: false,
      reason: 'started',
    });

    const registrationSecretValidation = await this.validateRegistrationSecret(input.secret);
    if (registrationSecretValidation.isErr()) {
      this.logRegistrationAudit('REGISTER_ATTEMPT', {
        sessionId: null,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      this.logRegistrationAudit('REGISTER_ATTEMPT', {
        sessionId: null,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: true,
        reason: 'generic_response',
      });
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
      ipAddress: deviceBinding.ipAddress,
      userAgentHash: deviceBinding.userAgentHash,
      verificationCodeHash: challenge.codeHash,
      codeExpiresAt: challenge.expiresAt,
      attempts: 0,
      lastSentAt: challenge.sentAt,
      verifiedAt: null,
      completedAt: null,
      status: 'email_sent',
      // Prevents replay of old tokens after session mutation.
      tokenVersion: (activePendingUser?.tokenVersion ?? 0) + 1,
    });

    const sendResult = await this.sendRegistrationVerification(pendingUser, challenge.code);
    if (sendResult.isErr()) {
      this.logRegistrationAudit('REGISTER_ATTEMPT', {
        sessionId: pendingUser.registrationSessionId,
        email: pendingUser.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    this.logRegistrationAudit('REGISTER_ATTEMPT', {
      sessionId: pendingUser.registrationSessionId,
      email: pendingUser.email,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok(
      this.toRegistrationChallengeResponse(
        pendingUser.email,
        pendingUser.registrationSessionId,
        challenge.expiresAt
      )
    );
  }

  async resumeRegistration(
    input: ResumeRegistrationInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<ResumeRegistrationResponse, Error>> {
    const payload = this.tokenService.verifyResumeRegistrationToken(input.resumeToken);
    if (!payload) {
      return Result.err(this.invalidRequestError());
    }

    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(payload.sessionId);
    if (!pendingUser) {
      return Result.err(this.invalidRequestError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);
    if (
      refreshedPendingUser.status !== 'email_sent' ||
      refreshedPendingUser.email !== payload.email ||
      refreshedPendingUser.tokenVersion !== payload.tokenVersion
    ) {
      return Result.err(this.invalidRequestError());
    }

    return Result.ok({
      email: refreshedPendingUser.email,
      registrationSessionId: refreshedPendingUser.registrationSessionId,
      verificationRequired: true,
      verificationExpiresAt: refreshedPendingUser.codeExpiresAt.toISOString(),
    });
  }

  async verifyRegistrationCode(
    input: VerifyRegistrationCodeInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<RegistrationVerificationResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const deviceBinding = this.toDeviceBinding(requestContext);
    const verificationResult = await this.pendingUserRepository.verifyCode({
      registrationSessionId: input.registrationSessionId,
      email: normalizedEmail,
      ipAddress: deviceBinding.ipAddress,
      userAgentHash: deviceBinding.userAgentHash,
      code: input.code,
      maxAttempts: MAX_REGISTRATION_CODE_ATTEMPTS,
      maxDeviceMismatches: MAX_DEVICE_MISMATCH_ATTEMPTS,
      verifyCode: (code, hash) => this.passwordHasher.verify(code, hash),
    });

    if (verificationResult.status !== 'verified') {
      this.logRegistrationAudit('VERIFY_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: verificationResult.status,
      });
      return Result.err(this.invalidRequestError());
    }

    const setupToken = this.tokenService.generateSetupRegistrationToken({
      sessionId: verificationResult.pendingUser.registrationSessionId,
      email: verificationResult.pendingUser.email,
      tokenVersion: verificationResult.pendingUser.tokenVersion,
    });

    this.logRegistrationAudit('VERIFY_ATTEMPT', {
      sessionId: verificationResult.pendingUser.registrationSessionId,
      email: verificationResult.pendingUser.email,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok({
      email: normalizedEmail,
      registrationSessionId: verificationResult.pendingUser.registrationSessionId,
      verified: true,
      setupToken,
    });
  }

  async resendRegistrationCode(
    input: ResendRegistrationCodeInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const deviceBinding = this.toDeviceBinding(requestContext);
    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(
      input.registrationSessionId
    );

    if (!pendingUser || pendingUser.email !== normalizedEmail) {
      this.logRegistrationAudit('RESEND_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      this.logRegistrationAudit('RESEND_ATTEMPT', {
        sessionId: pendingUser.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    if (refreshedPendingUser.status !== 'email_sent') {
      this.logRegistrationAudit('RESEND_ATTEMPT', {
        sessionId: refreshedPendingUser.registrationSessionId,
        email: refreshedPendingUser.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: refreshedPendingUser.status,
      });
      return Result.err(this.invalidRequestError());
    }

    const cooldownEndsAt = refreshedPendingUser.lastSentAt.getTime() + REGISTRATION_RESEND_COOLDOWN_MS;
    if (cooldownEndsAt > Date.now()) {
      this.logRegistrationAudit('RESEND_ATTEMPT', {
        sessionId: refreshedPendingUser.registrationSessionId,
        email: refreshedPendingUser.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'cooldown',
      });
      return Result.err(this.invalidRequestError());
    }

    const challenge = await this.createRegistrationChallenge();
    const updatedPendingUser = await this.pendingUserRepository.update(refreshedPendingUser.id, {
      ipAddress: deviceBinding.ipAddress,
      userAgentHash: deviceBinding.userAgentHash,
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
      this.logRegistrationAudit('RESEND_ATTEMPT', {
        sessionId: updatedPendingUser.registrationSessionId,
        email: updatedPendingUser.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    this.logRegistrationAudit('RESEND_ATTEMPT', {
      sessionId: updatedPendingUser.registrationSessionId,
      email: updatedPendingUser.email,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok(
      this.toRegistrationChallengeResponse(
        updatedPendingUser.email,
        updatedPendingUser.registrationSessionId,
        challenge.expiresAt
      )
    );
  }

  async completeRegistration(
    input: CompleteRegistrationInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<AuthResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const normalizedName = input.name.trim();
    const deviceBinding = this.toDeviceBinding(requestContext);

    const setupTokenPayload = this.tokenService.verifySetupRegistrationToken(input.setupToken);
    if (!setupTokenPayload) {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    if (
      setupTokenPayload.sessionId !== input.registrationSessionId ||
      setupTokenPayload.email !== normalizedEmail
    ) {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'token_mismatch',
      });
      return Result.err(this.invalidRequestError());
    }

    const pendingUser = await this.pendingUserRepository.findByRegistrationSessionId(
      input.registrationSessionId
    );
    if (!pendingUser) {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const refreshedPendingUser = await this.expirePendingUserIfNeeded(pendingUser);
    if (
      refreshedPendingUser.email !== normalizedEmail ||
      refreshedPendingUser.status !== 'verified' ||
      refreshedPendingUser.tokenVersion !== setupTokenPayload.tokenVersion
    ) {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: refreshedPendingUser.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: refreshedPendingUser.status,
      });
      return Result.err(this.invalidRequestError());
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: refreshedPendingUser.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const completionResult = await this.pendingUserRepository.completeRegistration({
      registrationSessionId: input.registrationSessionId,
      email: normalizedEmail,
      ipAddress: deviceBinding.ipAddress,
      userAgentHash: deviceBinding.userAgentHash,
      name: normalizedName,
      passwordHash,
      tokenVersion: setupTokenPayload.tokenVersion,
      maxDeviceMismatches: MAX_DEVICE_MISMATCH_ATTEMPTS,
    });

    if (completionResult.status !== 'created') {
      this.logRegistrationAudit('COMPLETE_ATTEMPT', {
        sessionId: input.registrationSessionId,
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: completionResult.status,
      });
      return Result.err(this.invalidRequestError());
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

    this.logRegistrationAudit('COMPLETE_ATTEMPT', {
      sessionId: input.registrationSessionId,
      email: normalizedEmail,
      ipAddress: deviceBinding.ipAddress,
      success: true,
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
      return Result.err(this.invalidRequestError());
    }

    if (!secret) {
      return Result.err(this.invalidRequestError());
    }

    if (secret !== expectedSecret) {
      return Result.err(this.invalidRequestError());
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
        return Result.err(this.invalidRequestError());
      }

      return Result.ok(undefined);
    } catch {
      return Result.err(this.invalidRequestError());
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

  // Prevents account enumeration and probing attacks.
  private invalidRequestError(): Error {
    return new AppError('INVALID_REQUEST', 400, 'INVALID_REQUEST');
  }

  private toDeviceBinding(requestContext?: RegistrationRequestContext): {
    ipAddress: string | null;
    userAgentHash: string | null;
  } {
    const ipAddress = requestContext?.ipAddress?.trim() || null;
    const userAgent = requestContext?.userAgent?.trim() || null;

    return {
      ipAddress,
      // Bind session to originating device to reduce token/session hijacking risk.
      userAgentHash: userAgent
        ? createHash('sha256').update(userAgent).digest('hex')
        : null,
    };
  }

  private async expirePendingUserIfNeeded(pendingUser: PendingUser): Promise<PendingUser> {
    if (pendingUser.status !== 'email_sent') {
      return pendingUser;
    }

    if (pendingUser.codeExpiresAt.getTime() >= Date.now()) {
      return pendingUser;
    }

    // Hard invalidation prevents reuse of expired sessions.
    return this.pendingUserRepository.update(pendingUser.id, {
      status: 'expired',
    });
  }

  // Audit trail enables abuse detection and incident tracing.
  private logRegistrationAudit(
    event: 'REGISTER_ATTEMPT' | 'VERIFY_ATTEMPT' | 'COMPLETE_ATTEMPT' | 'RESEND_ATTEMPT',
    payload: {
      sessionId: string | null;
      email: string;
      ipAddress: string | null;
      success: boolean;
      reason?: string;
    }
  ): void {
    console.log(
      '[AuthAudit]',
      JSON.stringify({
        event,
        sessionId: payload.sessionId,
        email: payload.email,
        ipAddress: payload.ipAddress,
        success: payload.success,
        reason: payload.reason,
        timestamp: new Date().toISOString(),
      })
    );
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

const getRegistrationRequestContext = (req: Request) => ({
  ipAddress: req.ip || null,
  userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
});

const handleVerifyRegistration = async (req: Request, res: Response, next: (error?: unknown) => void) => {
  try {
    const input = VerifyRegistrationCodeDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.verifyRegistrationCode(input, getRegistrationRequestContext(req));

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

    const result = await authUseCase.resumeRegistration(input, getRegistrationRequestContext(req));

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

    const result = await authUseCase.resendRegistrationCode(input, getRegistrationRequestContext(req));

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

      const result = await authUseCase.register(input, getRegistrationRequestContext(req));

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

    const result = await authUseCase.completeRegistration(input, getRegistrationRequestContext(req));

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
      pendingUser.ipAddress,
      pendingUser.userAgentHash,
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
      updates.ipAddress ?? existing.ipAddress,
      updates.userAgentHash ?? existing.userAgentHash,
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
    ipAddress: string | null;
    userAgentHash: string | null;
    code: string;
    maxAttempts: number;
    maxDeviceMismatches: number;
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

    if (
      pendingUser.ipAddress !== input.ipAddress ||
      pendingUser.userAgentHash !== input.userAgentHash
    ) {
      const attempts = pendingUser.attempts + 1;
      this.pendingUsers.set(
        pendingUser.registrationSessionId,
        new PendingUser(
          pendingUser.id,
          pendingUser.registrationSessionId,
          pendingUser.email,
          pendingUser.ipAddress,
          pendingUser.userAgentHash,
          pendingUser.verificationCodeHash,
          pendingUser.codeExpiresAt,
          attempts,
          pendingUser.lastSentAt,
          pendingUser.verifiedAt,
          pendingUser.completedAt,
          attempts > input.maxDeviceMismatches ? 'locked' : pendingUser.status,
          pendingUser.tokenVersion,
          pendingUser.createdAt,
          new Date()
        )
      );
      return { status: 'device-mismatch', attempts };
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
          pendingUser.ipAddress,
          pendingUser.userAgentHash,
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
      pendingUser.ipAddress,
      pendingUser.userAgentHash,
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
    ipAddress: string | null;
    userAgentHash: string | null;
    name: string;
    passwordHash: string;
    tokenVersion: number;
    maxDeviceMismatches: number;
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

    if (
      pendingUser.ipAddress !== input.ipAddress ||
      pendingUser.userAgentHash !== input.userAgentHash
    ) {
      const attempts = pendingUser.attempts + 1;
      this.pendingUsers.set(
        pendingUser.registrationSessionId,
        new PendingUser(
          pendingUser.id,
          pendingUser.registrationSessionId,
          pendingUser.email,
          pendingUser.ipAddress,
          pendingUser.userAgentHash,
          pendingUser.verificationCodeHash,
          pendingUser.codeExpiresAt,
          attempts,
          pendingUser.lastSentAt,
          pendingUser.verifiedAt,
          pendingUser.completedAt,
          attempts > input.maxDeviceMismatches ? 'locked' : pendingUser.status,
          pendingUser.tokenVersion,
          pendingUser.createdAt,
          new Date()
        )
      );
      return { status: 'device-mismatch', attempts };
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
        pendingUser.ipAddress,
        pendingUser.userAgentHash,
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
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(result.isOk()).toBe(true);
    expect(await userRepository.findByEmail('ada@example.com')).toBeNull();
    expect(result.unwrap().registrationSessionId).toBeTruthy();
    expect(await pendingUserRepository.findActiveByEmail('ada@example.com')).not.toBeNull();
  });

  it('supersedes an older session and only the latest session can verify', async () => {
    const firstResult = await authUseCase.register({
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
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
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const latestPendingUser = await pendingUserRepository.findActiveByEmail('ada@example.com');
    const latestCode = latestPendingUser!.verificationCodeHash.replace('hash:', '');

    const oldCodeResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: firstPendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code: firstCode,
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(oldCodeResult.isErr()).toBe(true);
    expect((oldCodeResult as { error: Error }).error.message).toBe(
      'INVALID_REQUEST'
    );

    const latestCodeResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: latestPendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code: latestCode,
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(latestCodeResult.isOk()).toBe(true);
    expect(await userRepository.findByEmail('ada@example.com')).toBeNull();
    expect((await pendingUserRepository.findActiveByEmail('ada@example.com'))?.verifiedAt).not.toBeNull();
  });

  it('enforces a resend cooldown for pending registrations', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const result = await authUseCase.resendRegistrationCode({
      registrationSessionId: registerResult.unwrap().registrationSessionId!,
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(result.isErr()).toBe(true);
    expect((result as { error: { code?: string; message: string } }).error.code).toBe('INVALID_REQUEST');
    expect((result as { error: Error }).error.message).toBe('INVALID_REQUEST');
  });

  it('locks verification after five invalid attempts', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    for (let attempt = 1; attempt < 5; attempt += 1) {
      const result = await authUseCase.verifyRegistrationCode({
        registrationSessionId: registerResult.unwrap().registrationSessionId!,
        email: 'ada@example.com',
        code: '00000000',
      }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
      });

      expect(result.isErr()).toBe(true);
      expect((result as { error: Error }).error.message).toBe(
        'INVALID_REQUEST'
      );
    }

    const lockedResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: registerResult.unwrap().registrationSessionId!,
      email: 'ada@example.com',
      code: '00000000',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    expect(lockedResult.isErr()).toBe(true);
    expect((lockedResult as { error: Error }).error.message).toBe(
      'INVALID_REQUEST'
    );
  });

  it('creates the user only after complete registration', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const pendingUser = await pendingUserRepository.findByRegistrationSessionId(
      registerResult.unwrap().registrationSessionId!
    );
    const code = pendingUser!.verificationCodeHash.replace('hash:', '');

    const verificationResult = await authUseCase.verifyRegistrationCode({
      registrationSessionId: pendingUser!.registrationSessionId,
      email: 'ada@example.com',
      code,
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const completionResult = await authUseCase.completeRegistration({
      registrationSessionId: pendingUser!.registrationSessionId,
      setupToken: verificationResult.unwrap().setupToken,
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      password: 'password-123',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
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
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const resumeResult = await authUseCase.resumeRegistration({
      resumeToken: `resume:${registerResult.unwrap().registrationSessionId}:ada@example.com:1`,
    });

    expect(resumeResult.isOk()).toBe(true);
    expect(resumeResult.unwrap().registrationSessionId).toBe(
      registerResult.unwrap().registrationSessionId
    );
  });

  it('rejects repeated device mismatches and locks the session', async () => {
    const registerResult = await authUseCase.register({
      email: 'ada@example.com',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
    });

    const pendingUser = await pendingUserRepository.findByRegistrationSessionId(
      registerResult.unwrap().registrationSessionId!
    );
    const code = pendingUser!.verificationCodeHash.replace('hash:', '');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await authUseCase.verifyRegistrationCode({
        registrationSessionId: pendingUser!.registrationSessionId,
        email: 'ada@example.com',
        code,
      }, {
        ipAddress: '10.0.0.99',
        userAgent: 'different-agent',
      });

      expect(result.isErr()).toBe(true);
      expect((result as { error: Error }).error.message).toBe('INVALID_REQUEST');
    }

    expect(
      (await pendingUserRepository.findByRegistrationSessionId(pendingUser!.registrationSessionId))?.status
    ).toBe('locked');
  });
});

```


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
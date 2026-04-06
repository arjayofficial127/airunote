import { injectable } from 'tsyringe';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { passwordResetRequestsTable } from '../db/drizzle/schema';
import { IPasswordResetRepository } from '../../application/interfaces/IPasswordResetRepository';
import { PasswordResetRequest } from '../../domain/entities/PasswordResetRequest';

type PasswordResetRequestRow = typeof passwordResetRequestsTable.$inferSelect;
type LockedPasswordResetRequestRow = {
  id: string;
  user_id: string;
  email: string;
  reset_token_hash: string;
  expires_at: unknown;
  attempts: number;
  used_at: unknown;
  created_at: unknown;
  updated_at: unknown;
};

const MAX_PASSWORD_RESET_ATTEMPTS = 5;

@injectable()
export class PasswordResetRepository implements IPasswordResetRepository {
  async createRequest(
    request: Omit<PasswordResetRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PasswordResetRequest> {
    return db.transaction(async (tx) => {
      await tx
        .update(passwordResetRequestsTable)
        .set({
          usedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(passwordResetRequestsTable.userId, request.userId),
            eq(passwordResetRequestsTable.email, request.email),
            isNull(passwordResetRequestsTable.usedAt),
            gt(passwordResetRequestsTable.expiresAt, new Date())
          )
        );

      const [created] = await tx
        .insert(passwordResetRequestsTable)
        .values({
          userId: request.userId,
          email: request.email,
          resetTokenHash: request.resetTokenHash,
          expiresAt: request.expiresAt,
          attempts: request.attempts,
          usedAt: request.usedAt,
        })
        .returning();

      return this.mapRequest(created);
    });
  }

  async findValidByTokenHash(tokenHash: string): Promise<PasswordResetRequest | null> {
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT
          id,
          user_id,
          email,
          reset_token_hash,
          expires_at,
          attempts,
          used_at,
          created_at,
          updated_at
        FROM password_reset_requests
        WHERE reset_token_hash = ${tokenHash}
        FOR UPDATE
      `);

      const record = lockedRows[0] as LockedPasswordResetRequestRow | undefined;
      if (!record) {
        return null;
      }

      const mapped = this.mapLockedRequest(record);
      if (
        mapped.usedAt ||
        mapped.expiresAt.getTime() < Date.now() ||
        mapped.attempts >= MAX_PASSWORD_RESET_ATTEMPTS
      ) {
        return null;
      }

      const [updated] = await tx
        .update(passwordResetRequestsTable)
        .set({
          attempts: mapped.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(passwordResetRequestsTable.id, mapped.id))
        .returning();

      return this.mapRequest(updated);
    });
  }

  async markUsed(id: string): Promise<void> {
    await db
      .update(passwordResetRequestsTable)
      .set({
        usedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(passwordResetRequestsTable.id, id));
  }

  private mapRequest(record: PasswordResetRequestRow): PasswordResetRequest {
    return new PasswordResetRequest(
      record.id,
      record.userId,
      record.email,
      record.resetTokenHash,
      this.toDate(record.expiresAt),
      record.attempts,
      record.usedAt ? this.toDate(record.usedAt) : null,
      this.toDate(record.createdAt),
      this.toDate(record.updatedAt)
    );
  }

  private mapLockedRequest(record: LockedPasswordResetRequestRow): PasswordResetRequest {
    return new PasswordResetRequest(
      record.id,
      record.user_id,
      record.email,
      record.reset_token_hash,
      this.toDate(record.expires_at),
      record.attempts,
      record.used_at ? this.toDate(record.used_at) : null,
      this.toDate(record.created_at),
      this.toDate(record.updated_at)
    );
  }

  private toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    return new Date(value as string | number);
  }
}
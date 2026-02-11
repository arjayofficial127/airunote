import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { joinRequestsTable } from '../db/drizzle/schema';
import { IJoinRequestRepository } from '../../application/interfaces/IJoinRequestRepository';
import { JoinRequest } from '../../domain/entities/JoinRequest';

@injectable()
export class JoinRequestRepository implements IJoinRequestRepository {
  async create(joinRequest: Omit<JoinRequest, 'id' | 'requestedAt' | 'reviewedAt'>): Promise<JoinRequest> {
    const [created] = await db
      .insert(joinRequestsTable)
      .values({
        orgId: joinRequest.orgId,
        userId: joinRequest.userId,
        joinCodeId: joinRequest.joinCodeId,
        status: joinRequest.status,
        message: joinRequest.message,
        reviewedByUserId: joinRequest.reviewedByUserId,
        rejectionReason: joinRequest.rejectionReason,
      })
      .returning();

    return new JoinRequest(
      created.id,
      created.orgId,
      created.userId,
      created.joinCodeId,
      created.status as 'pending' | 'approved' | 'rejected',
      created.message,
      created.requestedAt,
      created.reviewedAt,
      created.reviewedByUserId,
      created.rejectionReason
    );
  }

  async findById(id: string): Promise<JoinRequest | null> {
    const [request] = await db
      .select()
      .from(joinRequestsTable)
      .where(eq(joinRequestsTable.id, id))
      .limit(1);

    if (!request) return null;

    return new JoinRequest(
      request.id,
      request.orgId,
      request.userId,
      request.joinCodeId,
      request.status as 'pending' | 'approved' | 'rejected',
      request.message,
      request.requestedAt,
      request.reviewedAt,
      request.reviewedByUserId,
      request.rejectionReason
    );
  }

  async findByOrgId(orgId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<JoinRequest[]> {
    const conditions = [eq(joinRequestsTable.orgId, orgId)];
    if (status) {
      conditions.push(eq(joinRequestsTable.status, status));
    }

    const requests = await db
      .select()
      .from(joinRequestsTable)
      .where(and(...conditions));

    return requests.map(
      (r) =>
        new JoinRequest(
          r.id,
          r.orgId,
          r.userId,
          r.joinCodeId,
          r.status as 'pending' | 'approved' | 'rejected',
          r.message,
          r.requestedAt,
          r.reviewedAt,
          r.reviewedByUserId,
          r.rejectionReason
        )
    );
  }

  async findByUserId(userId: string): Promise<JoinRequest[]> {
    const requests = await db
      .select()
      .from(joinRequestsTable)
      .where(eq(joinRequestsTable.userId, userId));

    return requests.map(
      (r) =>
        new JoinRequest(
          r.id,
          r.orgId,
          r.userId,
          r.joinCodeId,
          r.status as 'pending' | 'approved' | 'rejected',
          r.message,
          r.requestedAt,
          r.reviewedAt,
          r.reviewedByUserId,
          r.rejectionReason
        )
    );
  }

  async findPendingByOrgIdAndUserId(orgId: string, userId: string): Promise<JoinRequest | null> {
    const [request] = await db
      .select()
      .from(joinRequestsTable)
      .where(
        and(
          eq(joinRequestsTable.orgId, orgId),
          eq(joinRequestsTable.userId, userId),
          eq(joinRequestsTable.status, 'pending')
        )
      )
      .limit(1);

    if (!request) return null;

    return new JoinRequest(
      request.id,
      request.orgId,
      request.userId,
      request.joinCodeId,
      request.status as 'pending' | 'approved' | 'rejected',
      request.message,
      request.requestedAt,
      request.reviewedAt,
      request.reviewedByUserId,
      request.rejectionReason
    );
  }

  async update(id: string, updates: Partial<JoinRequest>): Promise<JoinRequest> {
    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      updateData.reviewedAt = new Date();
    }
    if (updates.reviewedByUserId !== undefined) updateData.reviewedByUserId = updates.reviewedByUserId;
    if (updates.rejectionReason !== undefined) updateData.rejectionReason = updates.rejectionReason;
    if (updates.message !== undefined) updateData.message = updates.message;

    const [updated] = await db
      .update(joinRequestsTable)
      .set(updateData)
      .where(eq(joinRequestsTable.id, id))
      .returning();

    return new JoinRequest(
      updated.id,
      updated.orgId,
      updated.userId,
      updated.joinCodeId,
      updated.status as 'pending' | 'approved' | 'rejected',
      updated.message,
      updated.requestedAt,
      updated.reviewedAt,
      updated.reviewedByUserId,
      updated.rejectionReason
    );
  }

  async delete(id: string): Promise<void> {
    await db.delete(joinRequestsTable).where(eq(joinRequestsTable.id, id));
  }
}


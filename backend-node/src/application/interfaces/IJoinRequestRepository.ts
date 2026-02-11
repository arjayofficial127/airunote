import { JoinRequest } from '../../domain/entities/JoinRequest';

export interface IJoinRequestRepository {
  create(joinRequest: Omit<JoinRequest, 'id' | 'requestedAt' | 'reviewedAt'>): Promise<JoinRequest>;
  findById(id: string): Promise<JoinRequest | null>;
  findByOrgId(orgId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<JoinRequest[]>;
  findByUserId(userId: string): Promise<JoinRequest[]>;
  findPendingByOrgIdAndUserId(orgId: string, userId: string): Promise<JoinRequest | null>;
  update(id: string, updates: Partial<JoinRequest>): Promise<JoinRequest>;
  delete(id: string): Promise<void>;
}


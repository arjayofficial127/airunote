import { PasswordResetRequest } from '../../domain/entities/PasswordResetRequest';

export interface IPasswordResetRepository {
  createRequest(
    request: Omit<PasswordResetRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PasswordResetRequest>;
  findValidByTokenHash(tokenHash: string): Promise<PasswordResetRequest | null>;
  markUsed(id: string): Promise<void>;
}
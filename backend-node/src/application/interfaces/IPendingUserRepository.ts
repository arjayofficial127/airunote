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
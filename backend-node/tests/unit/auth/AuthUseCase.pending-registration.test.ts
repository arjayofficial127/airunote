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

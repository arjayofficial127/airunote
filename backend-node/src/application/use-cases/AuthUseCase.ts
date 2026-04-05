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


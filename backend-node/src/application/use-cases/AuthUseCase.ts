import { createHash, randomBytes, randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
} from '../../core/errors/AppError';
import { PendingUser } from '../../domain/entities/PendingUser';
import { PasswordResetRequest } from '../../domain/entities/PasswordResetRequest';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IPendingUserRepository } from '../interfaces/IPendingUserRepository';
import { IPasswordResetRepository } from '../interfaces/IPasswordResetRepository';
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
  RequestPasswordResetInput,
  VerifyResetTokenInput,
  ResetPasswordInput,
  GenericSuccessResponse,
  ResetTokenVerificationResponse,
} from '../dtos/auth.dto';
import { TYPES } from '../../core/di/types';

export interface IAuthUseCase {
  register(input: RegisterInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationChallengeResponse, Error>>;
  resumeRegistration(input: ResumeRegistrationInput, requestContext?: RegistrationRequestContext): Promise<Result<ResumeRegistrationResponse, Error>>;
  verifyRegistrationCode(input: VerifyRegistrationCodeInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationVerificationResponse, Error>>;
  resendRegistrationCode(input: ResendRegistrationCodeInput, requestContext?: RegistrationRequestContext): Promise<Result<RegistrationChallengeResponse, Error>>;
  completeRegistration(input: CompleteRegistrationInput, requestContext?: RegistrationRequestContext): Promise<Result<AuthResponse, Error>>;
  requestPasswordReset(input: RequestPasswordResetInput, requestContext?: RegistrationRequestContext): Promise<Result<GenericSuccessResponse, Error>>;
  verifyResetToken(input: VerifyResetTokenInput, requestContext?: RegistrationRequestContext): Promise<Result<ResetTokenVerificationResponse, Error>>;
  resetPassword(input: ResetPasswordInput, requestContext?: RegistrationRequestContext): Promise<Result<GenericSuccessResponse, Error>>;
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
const PASSWORD_RESET_EXPIRY_MINUTES = 15;

@injectable()
export class AuthUseCase implements IAuthUseCase {
  constructor(
    @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
    @inject(TYPES.IPendingUserRepository) private pendingUserRepository: IPendingUserRepository,
    @inject(TYPES.IPasswordResetRepository) private passwordResetRepository: IPasswordResetRepository,
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

  async requestPasswordReset(
    input: RequestPasswordResetInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<GenericSuccessResponse, Error>> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const deviceBinding = this.toDeviceBinding(requestContext);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || !user.isActive || !user.emailVerifiedAt) {
      this.logPasswordResetAudit('REQUEST_ATTEMPT', {
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: true,
        reason: 'generic_response',
      });
      return Result.ok({ success: true });
    }

    try {
      const resetToken = this.createPasswordResetToken(user.id, user.email);
      const resetTokenHash = this.hashResetToken(resetToken);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

      await this.passwordResetRepository.createRequest({
        userId: user.id,
        email: user.email,
        resetTokenHash,
        expiresAt,
        attempts: 0,
        usedAt: null,
      });

      const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        userName: user.name || 'there',
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      });
    } catch {
      this.logPasswordResetAudit('REQUEST_ATTEMPT', {
        email: normalizedEmail,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'send_failed',
      });

      return Result.ok({ success: true });
    }

    this.logPasswordResetAudit('REQUEST_ATTEMPT', {
      email: normalizedEmail,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok({ success: true });
  }

  async verifyResetToken(
    input: VerifyResetTokenInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<ResetTokenVerificationResponse, Error>> {
    const deviceBinding = this.toDeviceBinding(requestContext);
    const tokenPayload = this.tokenService.verifyPasswordResetToken(input.token);
    if (!tokenPayload) {
      this.logPasswordResetAudit('VERIFY_ATTEMPT', {
        email: 'unknown',
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const resetRequest = await this.passwordResetRepository.findValidByTokenHash(
      this.hashResetToken(input.token)
    );

    if (!resetRequest || !this.isResetTokenBound(resetRequest, tokenPayload.userId, tokenPayload.email)) {
      this.logPasswordResetAudit('VERIFY_ATTEMPT', {
        email: tokenPayload.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const user = await this.userRepository.findById(resetRequest.userId);
    if (!user || !user.isActive || !user.emailVerifiedAt) {
      this.logPasswordResetAudit('VERIFY_ATTEMPT', {
        email: tokenPayload.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    this.logPasswordResetAudit('VERIFY_ATTEMPT', {
      email: tokenPayload.email,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok({ valid: true });
  }

  async resetPassword(
    input: ResetPasswordInput,
    requestContext?: RegistrationRequestContext
  ): Promise<Result<GenericSuccessResponse, Error>> {
    const deviceBinding = this.toDeviceBinding(requestContext);
    const tokenPayload = this.tokenService.verifyPasswordResetToken(input.token);
    if (!tokenPayload) {
      this.logPasswordResetAudit('RESET_ATTEMPT', {
        email: 'unknown',
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const resetRequest = await this.passwordResetRepository.findValidByTokenHash(
      this.hashResetToken(input.token)
    );

    if (!resetRequest || !this.isResetTokenBound(resetRequest, tokenPayload.userId, tokenPayload.email)) {
      this.logPasswordResetAudit('RESET_ATTEMPT', {
        email: tokenPayload.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const user = await this.userRepository.findById(resetRequest.userId);
    if (!user || !user.isActive || !user.emailVerifiedAt) {
      this.logPasswordResetAudit('RESET_ATTEMPT', {
        email: tokenPayload.email,
        ipAddress: deviceBinding.ipAddress,
        success: false,
        reason: 'invalid_request',
      });
      return Result.err(this.invalidRequestError());
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.userRepository.update(user.id, { passwordHash });
    await this.passwordResetRepository.markUsed(resetRequest.id);

    this.logPasswordResetAudit('RESET_ATTEMPT', {
      email: tokenPayload.email,
      ipAddress: deviceBinding.ipAddress,
      success: true,
    });

    return Result.ok({ success: true });
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

  private createPasswordResetToken(userId: string, email: string): string {
    return this.tokenService.generatePasswordResetToken({
      userId,
      email,
      nonce: randomBytes(32).toString('hex'),
    });
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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

  private isResetTokenBound(
    resetRequest: PasswordResetRequest,
    userId: string,
    email: string
  ): boolean {
    return resetRequest.userId === userId && resetRequest.email === email;
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

  private logPasswordResetAudit(
    event: 'REQUEST_ATTEMPT' | 'VERIFY_ATTEMPT' | 'RESET_ATTEMPT',
    payload: {
      email: string;
      ipAddress: string | null;
      success: boolean;
      reason?: string;
    }
  ): void {
    console.log(
      '[PasswordResetAudit]',
      JSON.stringify({
        event,
        email: payload.email,
        ipAddress: payload.ipAddress,
        success: payload.success,
        reason: payload.reason,
        timestamp: new Date().toISOString(),
      })
    );
  }
}


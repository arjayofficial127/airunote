import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from '../../core/errors/AppError';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IAppSettingRepository } from '../interfaces/IAppSettingRepository';
import { IPasswordHasherService } from '../../infrastructure/services/PasswordHasherService';
import { ITokenService } from '../../infrastructure/services/TokenService';
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  RegistrationChallengeResponse,
  VerifyRegistrationCodeInput,
  ResendRegistrationCodeInput,
} from '../dtos/auth.dto';
import { TYPES } from '../../core/di/types';
import { EmailService } from '../../infrastructure/email/email.service';
import { User } from '../../domain/entities/User';

export interface IAuthUseCase {
  register(input: RegisterInput): Promise<Result<RegistrationChallengeResponse, Error>>;
  verifyRegistrationCode(input: VerifyRegistrationCodeInput): Promise<Result<AuthResponse, Error>>;
  resendRegistrationCode(input: ResendRegistrationCodeInput): Promise<Result<RegistrationChallengeResponse, Error>>;
  login(input: LoginInput): Promise<Result<AuthResponse, Error>>;
  refreshToken(refreshToken: string): Promise<Result<AuthResponse, Error>>;
}

const REGISTRATION_CODE_EXPIRY_MINUTES = 15;
const MAX_REGISTRATION_CODE_ATTEMPTS = 8;

@injectable()
export class AuthUseCase implements IAuthUseCase {
  constructor(
    @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
    @inject(TYPES.IAppSettingRepository)
    private appSettingRepository: IAppSettingRepository,
    @inject(TYPES.IPasswordHasherService)
    private passwordHasher: IPasswordHasherService,
    @inject(TYPES.ITokenService) private tokenService: ITokenService
  ) {}

  async register(input: RegisterInput): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim();

    const registrationSecretValidation = await this.validateRegistrationSecret(input.secret);
    if (registrationSecretValidation.isErr()) {
      return Result.err(registrationSecretValidation.error);
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser && existingUser.emailVerifiedAt) {
      return Result.err(new ConflictError('User with this email already exists'));
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const challenge = await this.createRegistrationChallenge();

    let user: User;
    if (existingUser) {
      user = await this.userRepository.update(existingUser.id, {
        name: normalizedName,
        passwordHash,
        isActive: true,
        emailVerifiedAt: null,
        registrationMfaCodeHash: challenge.codeHash,
        registrationMfaExpiresAt: challenge.expiresAt,
        registrationMfaAttemptCount: 0,
        registrationMfaLastSentAt: challenge.sentAt,
      });
    } else {
      user = await this.userRepository.create({
        email: normalizedEmail,
        passwordHash,
        name: normalizedName,
        isActive: true,
        defaultOrgId: null,
        emailVerifiedAt: null,
        registrationMfaCodeHash: challenge.codeHash,
        registrationMfaExpiresAt: challenge.expiresAt,
        registrationMfaAttemptCount: 0,
        registrationMfaLastSentAt: challenge.sentAt,
      });
    }

    const sendResult = await this.sendRegistrationVerification(user, challenge.code);
    if (sendResult.isErr()) {
      return Result.err(sendResult.error);
    }

    return Result.ok(this.toRegistrationChallengeResponse(user, challenge.expiresAt));
  }

  async verifyRegistrationCode(
    input: VerifyRegistrationCodeInput
  ): Promise<Result<AuthResponse, Error>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || !user.isActive) {
      return Result.err(new UnauthorizedError('Invalid verification request'));
    }

    if (user.emailVerifiedAt) {
      return Result.err(new ValidationError('This account is already verified. Please sign in.'));
    }

    if (!user.registrationMfaCodeHash || !user.registrationMfaExpiresAt) {
      return Result.err(new ValidationError('Please request a new verification code.'));
    }

    if (user.registrationMfaAttemptCount >= MAX_REGISTRATION_CODE_ATTEMPTS) {
      return Result.err(
        new AppError(
          'Too many attempts. Please request a new code.',
          429,
          'TOO_MANY_ATTEMPTS'
        )
      );
    }

    if (user.registrationMfaExpiresAt.getTime() < Date.now()) {
      return Result.err(new ValidationError('Verification code expired. Please request a new code.'));
    }

    const isValidCode = await this.passwordHasher.verify(input.code, user.registrationMfaCodeHash);
    if (!isValidCode) {
      const updatedAttemptCount = user.registrationMfaAttemptCount + 1;
      await this.userRepository.update(user.id, {
        registrationMfaAttemptCount: updatedAttemptCount,
      });

      if (updatedAttemptCount >= MAX_REGISTRATION_CODE_ATTEMPTS) {
        return Result.err(
          new AppError(
            'Too many attempts. Please request a new code.',
            429,
            'TOO_MANY_ATTEMPTS'
          )
        );
      }

      return Result.err(new ValidationError('Invalid verification code'));
    }

    const verifiedUser = await this.userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      registrationMfaCodeHash: null,
      registrationMfaExpiresAt: null,
      registrationMfaAttemptCount: 0,
      registrationMfaLastSentAt: null,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: verifiedUser.id,
      email: verifiedUser.email,
    });
    const refreshToken = this.tokenService.generateRefreshToken({
      userId: verifiedUser.id,
      email: verifiedUser.email,
    });

    return Result.ok({
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        name: verifiedUser.name,
      },
      accessToken,
      refreshToken,
    });
  }

  async resendRegistrationCode(
    input: ResendRegistrationCodeInput
  ): Promise<Result<RegistrationChallengeResponse, Error>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || !user.isActive) {
      return Result.err(new UnauthorizedError('Invalid verification request'));
    }

    if (user.emailVerifiedAt) {
      return Result.err(new ValidationError('This account is already verified. Please sign in.'));
    }

    const challenge = await this.createRegistrationChallenge();
    const updatedUser = await this.userRepository.update(user.id, {
      registrationMfaCodeHash: challenge.codeHash,
      registrationMfaExpiresAt: challenge.expiresAt,
      registrationMfaAttemptCount: 0,
      registrationMfaLastSentAt: challenge.sentAt,
    });

    const sendResult = await this.sendRegistrationVerification(updatedUser, challenge.code);
    if (sendResult.isErr()) {
      return Result.err(sendResult.error);
    }

    return Result.ok(this.toRegistrationChallengeResponse(updatedUser, challenge.expiresAt));
  }

  async login(input: LoginInput): Promise<Result<AuthResponse, Error>> {
    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

    if (!user || !user.isActive) {
      return Result.err(new UnauthorizedError('Invalid credentials'));
    }

    if (!user.emailVerifiedAt) {
      return Result.err(new UnauthorizedError('Please verify your email before signing in'));
    }

    const isValid = await this.passwordHasher.verify(
      input.password,
      user.passwordHash
    );

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

  async refreshToken(
    refreshToken: string
  ): Promise<Result<AuthResponse, Error>> {
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

  private async sendRegistrationVerification(user: User, code: string): Promise<Result<void, Error>> {
    try {
      const emailService = new EmailService();
      const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const verificationUrl = `${appUrl}/verify?email=${encodeURIComponent(user.email)}`;
      const result = await emailService.sendRegistrationVerificationEmail({
        to: user.email,
        userName: user.name || 'there',
        verificationCode: code,
        verificationUrl,
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
    user: User,
    expiresAt: Date
  ): RegistrationChallengeResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      email: user.email,
      verificationRequired: true,
      verificationExpiresAt: expiresAt.toISOString(),
    };
  }
}


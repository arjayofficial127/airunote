import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from '../../core/errors/AppError';
import { IUserRepository } from '../interfaces/IUserRepository';
import { IAppSettingRepository } from '../interfaces/IAppSettingRepository';
import { IPasswordHasherService } from '../../infrastructure/services/PasswordHasherService';
import { ITokenService } from '../../infrastructure/services/TokenService';
import { RegisterInput, LoginInput, AuthResponse } from '../dtos/auth.dto';
import { TYPES } from '../../core/di/types';

export interface IAuthUseCase {
  register(input: RegisterInput): Promise<Result<AuthResponse, Error>>;
  login(input: LoginInput): Promise<Result<AuthResponse, Error>>;
  refreshToken(refreshToken: string): Promise<Result<AuthResponse, Error>>;
}

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

  async register(input: RegisterInput): Promise<Result<AuthResponse, Error>> {
    // Check registration secret
    const registrationSecret = await this.appSettingRepository.findByKey(
      'registration_secret'
    );
    const expectedSecret =
      registrationSecret || process.env.REGISTRATION_SECRET || '';

    if (input.secret !== expectedSecret) {
      return Result.err(
        new ValidationError('Invalid registration secret')
      );
    }

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      return Result.err(
        new ConflictError('User with this email already exists')
      );
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(input.password);

    // Create user
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      isActive: true,
      defaultOrgId: null,
    });

    // Generate tokens
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

  async login(input: LoginInput): Promise<Result<AuthResponse, Error>> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !user.isActive) {
      return Result.err(new UnauthorizedError('Invalid credentials'));
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
}


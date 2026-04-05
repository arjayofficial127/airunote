import { injectable } from 'tsyringe';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface RegistrationTokenPayload {
  purpose: 'resume-registration' | 'complete-registration';
  sessionId: string;
  email: string;
  tokenVersion: number;
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): string;
  generateRefreshToken(payload: TokenPayload): string;
  generateResumeRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string;
  generateSetupRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): TokenPayload | null;
  verifyResumeRegistrationToken(token: string): RegistrationTokenPayload | null;
  verifySetupRegistrationToken(token: string): RegistrationTokenPayload | null;
}

@injectable()
export class TokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly registrationSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly registrationResumeExpiresIn: string;
  private readonly registrationSetupExpiresIn: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET || '';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || '';
    this.registrationSecret = process.env.JWT_REGISTRATION_SECRET || this.accessSecret;
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.registrationResumeExpiresIn = process.env.JWT_REGISTRATION_RESUME_EXPIRES_IN || '15m';
    this.registrationSetupExpiresIn = process.env.JWT_REGISTRATION_SETUP_EXPIRES_IN || '15m';

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error('JWT secrets must be set in environment variables');
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.accessExpiresIn as any,
    };
    return jwt.sign(payload, this.accessSecret, options);
  }

  generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.refreshExpiresIn as any,
    };
    return jwt.sign(payload, this.refreshSecret, options);
  }

  generateResumeRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string {
    return this.generateRegistrationToken(
      {
        ...payload,
        purpose: 'resume-registration',
      },
      this.registrationResumeExpiresIn
    );
  }

  generateSetupRegistrationToken(
    payload: Omit<RegistrationTokenPayload, 'purpose'>
  ): string {
    return this.generateRegistrationToken(
      {
        ...payload,
        purpose: 'complete-registration',
      },
      this.registrationSetupExpiresIn
    );
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  verifyResumeRegistrationToken(token: string): RegistrationTokenPayload | null {
    const payload = this.verifyRegistrationToken(token);
    if (!payload || payload.purpose !== 'resume-registration') {
      return null;
    }

    return payload;
  }

  verifySetupRegistrationToken(token: string): RegistrationTokenPayload | null {
    const payload = this.verifyRegistrationToken(token);
    if (!payload || payload.purpose !== 'complete-registration') {
      return null;
    }

    return payload;
  }

  private generateRegistrationToken(
    payload: RegistrationTokenPayload,
    expiresIn: string
  ): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any,
    };

    return jwt.sign(payload, this.registrationSecret, options);
  }

  private verifyRegistrationToken(token: string): RegistrationTokenPayload | null {
    try {
      return jwt.verify(token, this.registrationSecret) as RegistrationTokenPayload;
    } catch {
      return null;
    }
  }
}


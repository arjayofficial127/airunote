import { z } from 'zod';

export const RegisterDto = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  secret: z.string().min(1).optional(),
});

export const VerifyRegistrationCodeDto = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{8}$/, 'Verification code must be exactly 8 digits'),
});

export const ResendRegistrationCodeDto = z.object({
  email: z.string().email(),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type VerifyRegistrationCodeInput = z.infer<typeof VerifyRegistrationCodeDto>;
export type ResendRegistrationCodeInput = z.infer<typeof ResendRegistrationCodeDto>;
export type LoginInput = z.infer<typeof LoginDto>;

export interface RegistrationChallengeResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  email: string;
  verificationRequired: true;
  verificationExpiresAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}


import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email(),
  secret: z.string().min(1).optional(),
});

export const ResumeRegistrationDto = z.object({
  resumeToken: z.string().min(1),
});

export const VerifyRegistrationCodeDto = z.object({
  registrationSessionId: z.string().uuid(),
  email: z.string().email(),
  code: z.string().regex(/^\d{8}$/, 'Verification code must be exactly 8 digits'),
});

export const ResendRegistrationCodeDto = z.object({
  registrationSessionId: z.string().uuid(),
  email: z.string().email(),
});

export const CompleteRegistrationDto = z.object({
  registrationSessionId: z.string().uuid(),
  setupToken: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8),
});

export const RequestPasswordResetDto = z.object({
  email: z.string().email(),
});

export const VerifyResetTokenDto = z.object({
  token: z.string().min(1),
});

export const ResetPasswordDto = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type ResumeRegistrationInput = z.infer<typeof ResumeRegistrationDto>;
export type VerifyRegistrationCodeInput = z.infer<typeof VerifyRegistrationCodeDto>;
export type ResendRegistrationCodeInput = z.infer<typeof ResendRegistrationCodeDto>;
export type CompleteRegistrationInput = z.infer<typeof CompleteRegistrationDto>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetDto>;
export type VerifyResetTokenInput = z.infer<typeof VerifyResetTokenDto>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
export type LoginInput = z.infer<typeof LoginDto>;

export interface RegistrationChallengeResponse {
  email: string;
  registrationSessionId: string | null;
  verificationRequired: true;
  verificationExpiresAt: string | null;
}

export interface ResumeRegistrationResponse {
  email: string;
  registrationSessionId: string;
  verificationRequired: true;
  verificationExpiresAt: string;
}

export interface RegistrationVerificationResponse {
  email: string;
  registrationSessionId: string;
  verified: true;
  setupToken: string;
}

export interface GenericSuccessResponse {
  success: true;
}

export interface ResetTokenVerificationResponse {
  valid: true;
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


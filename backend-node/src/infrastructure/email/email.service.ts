import { Resend } from 'resend';
import { OrgCreatedEmailPayload, LoginSuccessEmailPayload } from './email.types';
import { renderOrgCreatedEmail, renderLoginSuccessEmail } from './email.templates';

export class EmailService {
  private resend: Resend;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not defined');
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendOrgCreatedEmail(payload: OrgCreatedEmailPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { subject, html } = renderOrgCreatedEmail(payload);

      await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'AiruNote <no-reply@airunote.app>',
        to: payload.to,
        subject,
        html,
      });

      console.log(`[EmailService] ✅ Org created email sent successfully to ${payload.to}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(`[EmailService] ❌ Failed to send org created email to ${payload.to}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendLoginSuccessEmail(payload: LoginSuccessEmailPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { subject, html } = renderLoginSuccessEmail(payload);

      await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'AiruNote <no-reply@airunote.app>',
        to: payload.to,
        subject,
        html,
      });

      console.log(`[EmailService] ✅ Login success email sent successfully to ${payload.to}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(`[EmailService] ❌ Failed to send login success email to ${payload.to}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

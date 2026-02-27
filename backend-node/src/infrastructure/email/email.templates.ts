import { OrgCreatedEmailPayload, LoginSuccessEmailPayload } from './email.types';

export function renderOrgCreatedEmail(
  payload: OrgCreatedEmailPayload
): { subject: string; html: string } {
  const { userName, orgName, dashboardUrl } = payload;

  const subject = `Welcome to AiruNote - ${orgName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Welcome to AiruNote
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Your organization <strong style="color: #1a1a1a;">${orgName}</strong> has been successfully created. You're all set to start organizing your thoughts, structuring your projects, and building with how you see things.
              </p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Everything begins with your base.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8B; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; letter-spacing: 0.3px;">
                Go to Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                © 2020–2025 AOTECH / airunote. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b0b0b0;">
                This email was sent to notify you about your new organization.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

export function renderLoginSuccessEmail(
  payload: LoginSuccessEmailPayload
): { subject: string; html: string } {
  const { userName, loginTime, ipAddress, userAgent } = payload;

  const subject = 'Successful Login to AiruNote';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Login Successful
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                You have successfully logged into your AiruNote account.
              </p>
              <div style="background-color: #f9f9f9; border-left: 4px solid #1E3A8B; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 20px; color: #4a4a4a;">
                  <strong style="color: #1a1a1a;">Login Time:</strong> ${loginTime}
                </p>
                ${ipAddress ? `<p style="margin: 0 0 8px 0; font-size: 14px; line-height: 20px; color: #4a4a4a;"><strong style="color: #1a1a1a;">IP Address:</strong> ${ipAddress}</p>` : ''}
                ${userAgent ? `<p style="margin: 0; font-size: 14px; line-height: 20px; color: #4a4a4a;"><strong style="color: #1a1a1a;">Device:</strong> ${userAgent}</p>` : ''}
              </div>
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                If you did not perform this login, please secure your account immediately.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8B; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; letter-spacing: 0.3px;">
                Go to Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #8a8a8a;">
                © 2020–2025 AOTECH / airunote. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b0b0b0;">
                This email was sent for security purposes to notify you of account activity.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

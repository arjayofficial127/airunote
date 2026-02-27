export interface BaseEmailPayload {
  to: string;
}

export interface OrgCreatedEmailPayload extends BaseEmailPayload {
  userName: string;
  orgName: string;
  dashboardUrl: string;
}

export interface LoginSuccessEmailPayload extends BaseEmailPayload {
  userName: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
}

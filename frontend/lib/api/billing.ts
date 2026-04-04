import apiClient from './client';

export interface CreateBillingCheckoutIntentResponse {
  success: boolean;
  data: {
    billingIntentId: string;
    reused?: boolean;
  };
}

export const billingApi = {
  createCheckoutIntent: async (orgId: string, source: string): Promise<CreateBillingCheckoutIntentResponse> => {
    const response = await apiClient.post(`/orgs/${orgId}/billing/checkout-intent`, { source });
    return response.data;
  },
};
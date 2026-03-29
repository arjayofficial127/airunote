export function buildCheckoutUrl(orgId: string, successUrl?: string) {
  const base = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL!;
  const params = new URLSearchParams();

  params.set('checkout_data[custom][orgId]', orgId);

  if (successUrl) {
    params.set('checkout[success_url]', successUrl);
  }

  return `${base}?${params.toString()}`;
}
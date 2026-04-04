export function buildCheckoutUrl(orgId: string, billingIntentId: string, successUrl?: string) {
  const base = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL!;
  const params = new URLSearchParams();

  params.set('checkout_data[custom][orgId]', orgId);
  params.set('checkout_data[custom][billingIntentId]', billingIntentId);

  if (successUrl) {
    params.set('checkout[success_url]', successUrl);
  }

  const checkoutUrl = `${base}?${params.toString()}`;

  if (typeof window !== 'undefined') {
    console.log('[Checkout] Redirecting to Lemon checkout', {
      orgId,
      billingIntentId,
      successUrl: successUrl ?? null,
      checkoutUrl,
    });
  }

  return checkoutUrl;
}
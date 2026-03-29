export function buildCheckoutUrl(orgId: string) {
  const base = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL!;
  return `${base}?checkout_data[custom][orgId]=${orgId}`;
}
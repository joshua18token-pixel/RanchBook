import { supabase } from './supabase';

export const TIERS = {
  free: { name: 'Free', maxCows: 10, monthlyPrice: 0, annualPrice: 0 },
  starter: { name: 'Starter', maxCows: 100, monthlyPrice: 10, annualPrice: 102 },
  pro: { name: 'Ranch Pro', maxCows: 500, monthlyPrice: 20, annualPrice: 204 },
  max: { name: 'Ranch Max', maxCows: 999999, monthlyPrice: 35, annualPrice: 357 },
} as const;

export type TierKey = keyof typeof TIERS;

export interface RanchBilling {
  subscription_tier: TierKey;
  subscription_status: string;
  subscription_override: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  peak_cow_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export async function getRanchBilling(ranchId: string): Promise<RanchBilling> {
  const { data, error } = await supabase
    .from('ranches')
    .select('subscription_tier, subscription_status, subscription_override, trial_ends_at, current_period_end, peak_cow_count, stripe_customer_id, stripe_subscription_id')
    .eq('id', ranchId)
    .single();

  if (error) throw error;
  return data as RanchBilling;
}

export function getTierForCowCount(count: number): TierKey {
  if (count <= 10) return 'free';
  if (count <= 100) return 'starter';
  if (count <= 500) return 'pro';
  return 'max';
}

export function getRequiredTier(currentCowCount: number): TierKey {
  return getTierForCowCount(currentCowCount);
}

export function canAddCow(billing: RanchBilling, currentCowCount: number): { allowed: boolean; reason?: string; requiredTier?: TierKey } {
  // Lifetime free — always allowed
  if (billing.subscription_override === 'lifetime_free') {
    return { allowed: true };
  }

  // Check trial
  if (billing.subscription_override === 'trial') {
    if (billing.trial_ends_at && new Date(billing.trial_ends_at) > new Date()) {
      return { allowed: true }; // Trial still active
    }
    // Trial expired — fall through to normal checks
  }

  // Read-only mode
  if (billing.subscription_status === 'read_only' || billing.subscription_status === 'past_due') {
    return { allowed: false, reason: 'Your subscription has lapsed. Please update your payment to continue.' };
  }

  const tier = billing.subscription_tier as TierKey;
  const maxCows = TIERS[tier]?.maxCows ?? 10;

  if (currentCowCount >= maxCows) {
    const required = getRequiredTier(currentCowCount + 1);
    return {
      allowed: false,
      reason: `You've reached the ${TIERS[tier].name} plan limit of ${maxCows} cows. Upgrade to ${TIERS[required].name} to add more.`,
      requiredTier: required,
    };
  }

  return { allowed: true };
}

export function isReadOnly(billing: RanchBilling): boolean {
  if (billing.subscription_override === 'lifetime_free') return false;

  if (billing.subscription_override === 'trial') {
    if (billing.trial_ends_at && new Date(billing.trial_ends_at) > new Date()) {
      return false;
    }
    return true; // Trial expired
  }

  return billing.subscription_status === 'read_only' || billing.subscription_status === 'canceled';
}

// Create a Stripe Checkout session via Edge Function
export async function createCheckoutSession(ranchId: string, tier: TierKey, interval: 'monthly' | 'annual'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { ranchId, tier, interval },
  });

  if (error) throw error;
  return data.url;
}

// Open Stripe Customer Portal for managing subscription
export async function openCustomerPortal(ranchId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: { ranchId },
  });

  if (error) throw error;
  return data.url;
}

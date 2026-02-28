# RanchBook Billing Spec v2

## Tiers

### Free
- Up to 10 cows per ranch
- All features included (no feature gating)
- Unlimited team members
- No credit card required
- Adding cow #11 prompts upgrade

### Starter — $10/mo ($102/yr)
- Up to 100 cows
- All features
- Unlimited team members

### Ranch Pro — $20/mo ($204/yr)
- Up to 500 cows
- All features
- Unlimited team members

### Ranch Max — $35/mo ($357/yr)
- Unlimited cows
- All features
- Unlimited team members

**Annual plans = 15% discount**

## Billing Rules

- **Who pays:** The ranch. Manager (owner) is billing contact.
- **Multi-ranch:** Each ranch billed separately.
- **Tier based on peak cow count** during billing period.
- **Auto-upgrade:** If ranch exceeds tier limit, prompt to upgrade. Can't add cows beyond limit without upgrading.
- **Downgrade:** If cows drop below tier limit, can downgrade at next billing period.
- **Unpaid/expired:** Ranch enters **read-only mode** — can view, search, export. Cannot add/edit. Data NEVER deleted. Free tier (10 cows) still editable.
- **Payment restored:** Full access unlocks instantly, all data intact.
- **30-day free trial:** For Starter+ plans. All features, no cow limit. After 30 days → read-only if no payment.

## Super Admin

- App-level admin (separate from ranch manager)
- Can view all ranches, all users, metrics
- Can grant **lifetime free membership** to any ranch
- Can revoke lifetime free at any time
- Super admin identified by user ID(s) in environment variable

## Lifetime Free Membership

- `subscription_override` field on `ranches` table
- Values: `null` (normal billing), `'lifetime_free'`, `'trial'`
- Billing logic checks this first — if `lifetime_free`, skip all payment checks
- Only super admin can set/revoke

## Database Changes

### Add to `ranches` table:
```sql
ALTER TABLE ranches ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE ranches ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE ranches ADD COLUMN subscription_tier TEXT DEFAULT 'free'; -- free, starter, pro, max
ALTER TABLE ranches ADD COLUMN subscription_status TEXT DEFAULT 'active'; -- active, trial, past_due, canceled, read_only
ALTER TABLE ranches ADD COLUMN subscription_override TEXT; -- null, lifetime_free, trial
ALTER TABLE ranches ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE ranches ADD COLUMN current_period_end TIMESTAMPTZ;
ALTER TABLE ranches ADD COLUMN peak_cow_count INTEGER DEFAULT 0;
```

### Stripe Products to Create:
- **Starter Monthly:** $10/mo
- **Starter Annual:** $102/yr
- **Ranch Pro Monthly:** $20/mo
- **Ranch Pro Annual:** $204/yr
- **Ranch Max Monthly:** $35/mo
- **Ranch Max Annual:** $357/yr

## Implementation

### Frontend:
- Pricing/upgrade screen accessible from ranch settings
- Stripe Checkout for payment collection (redirect to Stripe-hosted page)
- Subscription status shown in ranch settings
- "Upgrade" prompts when hitting cow limits
- Read-only mode banner when subscription lapses

### Backend (Supabase Edge Functions):
- `create-checkout-session` — creates Stripe Checkout session for selected plan
- `stripe-webhook` — handles Stripe events (payment success, failure, subscription changes)
- `check-subscription` — validates ranch has active subscription for cow count
- `manage-subscription` — cancel, change plan, update payment method

### Stripe Webhook Events to Handle:
- `checkout.session.completed` — subscription created
- `invoice.paid` — payment succeeded
- `invoice.payment_failed` — payment failed
- `customer.subscription.updated` — plan changed
- `customer.subscription.deleted` — subscription canceled

## Cow Limits by Tier:
- Free: 10
- Starter: 100
- Ranch Pro: 500
- Ranch Max: unlimited (999999)

# RanchBook Billing Spec

## Tiers

### Starter (Free)
- Up to 10 cows per ranch
- All features included (no feature gating)
- Unlimited team members
- No credit card required
- Adding cow #11 prompts upgrade

### Ranch Pro — Monthly
- Unlimited cows
- **(cows over 10) × $1/year ÷ 12** per month
- **$10/month minimum** once in paid tier
- Billed monthly based on **peak cow count** during billing period
- Peak count prevents gaming (deleting cows before billing day)

### Ranch Pro — Annual
- Unlimited cows
- **(cows over 10) × $0.85/year** (15% discount)
- **$102/year minimum** ($10/mo equivalent)
- Paid upfront
- 30-day free trial with all features, no cow limit
- If overflow occurs (more cows than plan covers), overflow billed monthly using same monthly formula ($10/mo minimum on overflow)

## Billing Rules

- **Who pays:** The ranch. Manager (owner) is billing contact.
- **Multi-ranch:** Each ranch billed separately based on its own cow count.
- **Peak billing:** Monthly bill uses highest cow count during the billing period. Resets each period.
- **Unpaid/expired:** Ranch enters **read-only mode** — can view, search, export, but cannot add/edit cows. Data is NEVER deleted. 10 free cows still editable.
- **Payment restored:** Full access unlocks instantly, all data intact.

## Super Admin

- Separate from ranch manager role — app-level admin
- Can view all ranches, all users, metrics
- Can grant **lifetime free membership** to any ranch (`subscription_override` flag)
- Can revoke lifetime free at any time
- Super admin identified by user ID(s) in config/environment variable

## Lifetime Free Membership

- `subscription_override` field on `ranches` table
- Values: `null` (normal billing), `'lifetime_free'` (no charges ever), `'trial'` (30-day trial)
- Billing logic checks this flag first — if set to `lifetime_free`, skip all payment checks
- Only super admin can set/revoke

## Future Ideas (Not Building Yet)

### Day Worker Account Type
- Free account not tied to specific ranch
- Read-only access to any ranch they're invited to (no cost to ranch)
- Carries profile across ranches

### Referral Program ("Cowboy Credits")
- Unique referral code per user
- New ranch signup via code → referrer gets credit ($5 off or free month)
- Traveling cowboys could use app free through referrals

### Commission Model
- Cowboys earn % of first year revenue from referred ranches
- Paid via Stripe Connect or app credit

## Implementation Notes

- **Stripe Billing** for subscriptions
- **Stripe Checkout** for credit card collection
- **Supabase Edge Function** for cow count calculation + Stripe webhook handling
- **Stripe Products:** Create "Ranch Pro Monthly" and "Ranch Pro Annual" products
- **Metered billing** for monthly plan (report usage each period)
- Add `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_override` columns to `ranches` table

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { TIERS, TierKey, getRanchBilling, createCheckoutSession, openCustomerPortal, RanchBilling } from '../services/billing';

const TIER_ORDER: TierKey[] = ['free', 'starter', 'pro', 'max'];

export default function SubscriptionScreen({ route }: any) {
  const { ranchId, ranchName } = route.params;
  const [billing, setBilling] = useState<RanchBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    try {
      const data = await getRanchBilling(ranchId);
      setBilling(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (tier: TierKey) => {
    if (tier === 'free') return;
    if (tier === billing?.subscription_tier && billing?.subscription_status === 'active') {
      // Already on this plan — open customer portal to manage
      try {
        const url = await openCustomerPortal(ranchId);
        if (Platform.OS === 'web') {
          window.open(url, '_blank');
        }
      } catch (e: any) {
        const msg = e.message || 'Could not open billing portal';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      }
      return;
    }

    setCheckoutLoading(tier);
    try {
      const url = await createCheckoutSession(ranchId, tier, interval);
      if (Platform.OS === 'web') {
        window.location.href = url;
      }
    } catch (e: any) {
      const msg = e.message || 'Could not start checkout';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const url = await openCustomerPortal(ranchId);
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      }
    } catch (e: any) {
      const msg = e.message || 'Could not open billing portal';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#C5A55A" />
      </View>
    );
  }

  const currentTier = billing?.subscription_tier as TierKey || 'free';
  const isLifetimeFree = billing?.subscription_override === 'lifetime_free';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscription</Text>
      <Text style={styles.subtitle}>{ranchName}</Text>

      {isLifetimeFree && (
        <View style={styles.lifetimeBanner}>
          <Text style={styles.lifetimeText}>⭐ Lifetime Free Membership</Text>
        </View>
      )}

      {billing?.subscription_status === 'read_only' && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Your subscription has lapsed. Your data is safe but editing is disabled. Choose a plan below to restore access.</Text>
        </View>
      )}

      {/* Interval toggle */}
      {!isLifetimeFree && (
        <View style={styles.intervalRow}>
          <TouchableOpacity
            style={[styles.intervalBtn, interval === 'monthly' && styles.intervalActive]}
            onPress={() => setInterval('monthly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.intervalText, interval === 'monthly' && styles.intervalActiveText]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.intervalBtn, interval === 'annual' && styles.intervalActive]}
            onPress={() => setInterval('annual')}
            activeOpacity={0.7}
          >
            <Text style={[styles.intervalText, interval === 'annual' && styles.intervalActiveText]}>Annual (Save 15%)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Plan cards */}
      {!isLifetimeFree && TIER_ORDER.map((tierKey) => {
        const tier = TIERS[tierKey];
        const isCurrent = tierKey === currentTier && billing?.subscription_status === 'active';
        const price = interval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
        const priceLabel = tierKey === 'free' ? 'Free' : interval === 'monthly' ? `$${price}/mo` : `$${price}/yr`;
        const cowLabel = tier.maxCows >= 999999 ? 'Unlimited cows' : `Up to ${tier.maxCows} cows`;

        return (
          <View
            key={tierKey}
            style={[styles.planCard, isCurrent && styles.planCardCurrent]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{tier.name}</Text>
              <Text style={styles.planPrice}>{priceLabel}</Text>
            </View>
            <Text style={styles.planCows}>{cowLabel}</Text>
            <Text style={styles.planFeatures}>All features • Unlimited team members</Text>

            {tierKey === 'free' ? (
              isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current Plan</Text>
                </View>
              ) : null
            ) : (
              <TouchableOpacity
                style={[styles.selectBtn, isCurrent && styles.selectBtnCurrent]}
                onPress={() => handleSelectPlan(tierKey)}
                disabled={!!checkoutLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectBtnText, isCurrent && styles.selectBtnCurrentText]}>
                  {checkoutLoading === tierKey ? 'Loading...' : isCurrent ? 'Manage Plan' : 'Select Plan'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Manage existing subscription */}
      {billing?.stripe_subscription_id && (
        <TouchableOpacity style={styles.manageBtn} onPress={handleManageBilling} activeOpacity={0.7}>
          <Text style={styles.manageBtnText}>Manage Billing & Payment Method</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>
        All plans include every feature. No feature gating.{'\n'}
        Your data is never deleted, even if your subscription lapses.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#6B6B6B', marginBottom: 20 },
  lifetimeBanner: {
    backgroundColor: '#C5A55A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  lifetimeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  warningText: { fontSize: 14, color: '#333', lineHeight: 20 },
  intervalRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  intervalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  intervalActive: { backgroundColor: '#1A1A1A' },
  intervalText: { fontSize: 14, fontWeight: '600', color: '#666' },
  intervalActiveText: { color: '#C5A55A' },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardCurrent: {
    borderWidth: 2,
    borderColor: '#C5A55A',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: '#C5A55A' },
  planCows: { fontSize: 15, color: '#6B6B6B', marginBottom: 4 },
  planFeatures: { fontSize: 13, color: '#999', marginBottom: 14 },
  currentBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentBadgeText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  selectBtn: {
    backgroundColor: '#C5A55A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectBtnCurrent: {
    backgroundColor: '#1A1A1A',
  },
  selectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  selectBtnCurrentText: { color: '#C5A55A' },
  manageBtn: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  manageBtnText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  footer: {
    marginTop: 24,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

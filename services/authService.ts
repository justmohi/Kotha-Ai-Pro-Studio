import { UserProfile, SubscriptionTier, PricingPlan } from '../types';

const STORAGE_KEY = 'kotha_user_profile_v1';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$2.99',
    period: '/ month',
    monthlyGenerations: '35 generations / month',
    generationsLimit: 35,
    maxDurationLabel: 'Up to 3 minutes',
    maxDurationSeconds: 180,
    description: 'Perfect for content creators, students, and short narration clips.',
    features: [
      '35 generations per month',
      'Up to 3 minutes duration per generation',
      'Standard voice library (all 9 studio actors)',
      'High-fidelity MP3 & WAV studio export',
      'Speech modifiers ([emphasize], [whisper], [loud])',
      'Custom pause timing tags'
    ]
  },
  {
    id: 'plus',
    name: 'Plus Plan',
    price: '$9.99',
    period: '/ month',
    monthlyGenerations: '100 generations / month',
    generationsLimit: 100,
    maxDurationLabel: 'Up to 10 minutes',
    maxDurationSeconds: 600,
    badge: 'Most Popular',
    highlight: true,
    description: 'Designed for YouTubers, podcasters, and creative studios needing rich soundtracks.',
    features: [
      '100 generations per month',
      'Up to 10 minutes duration per generation',
      'Full BGM soundtrack overlay with ducking control',
      'Custom Voice Cloning (Beta studio audio mixing)',
      'Custom preset manager & unlimited preset slots',
      'Standard + emotional tone modulation',
      'Full commercial rights for social media & video'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '$19.99',
    period: '/ month',
    monthlyGenerations: 'Unlimited generations',
    generationsLimit: -1,
    maxDurationLabel: 'Up to 30 minutes',
    maxDurationSeconds: 1800,
    badge: 'Ultimate Power',
    description: 'For production houses, agencies, and enterprise audio publishing.',
    features: [
      'Unlimited audio generations',
      'Max duration up to 30 minutes per clip',
      'Priority server queue & ultra-fast synthesis',
      'Full commercial license for broadcast & business',
      'All present & upcoming studio voice models',
      'Dedicated studio audio mastering filters',
      'Priority 24/7 technical support'
    ]
  }
];

export const FREE_TIER_LIMITS = {
  monthlyLimit: 10,
  maxDurationSeconds: 30,
  maxDurationLabel: 'Max 30s'
};

const getDefaultBillingCycle = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

export const createDefaultProfile = (isGoogle = false, details?: Partial<UserProfile>): UserProfile => {
  const uid = details?.uid || details?.id || 'guest-' + Math.random().toString(36).substring(2, 9);
  return {
    id: uid,
    uid,
    name: details?.name || (isGoogle ? 'Creator Account' : 'Guest Creator'),
    email: details?.email || (isGoogle ? 'creator@gmail.com' : ''),
    avatar: details?.avatar || (isGoogle ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' : ''),
    isGoogleUser: isGoogle,
    tier: 'free',
    creditsUsed: 0,
    monthlyLimit: FREE_TIER_LIMITS.monthlyLimit,
    maxDurationSeconds: FREE_TIER_LIMITS.maxDurationSeconds,
    billingCycleEnd: getDefaultBillingCycle(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...details
  };
};

export const initiateCheckout = async (
  tier: SubscriptionTier,
  userId: string,
  userEmail?: string,
  provider: 'stripe' | 'sslcommerz' = 'stripe'
): Promise<{ checkoutUrl?: string; provider?: string; isSimulated?: boolean; message?: string; error?: string }> => {
  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        userId,
        userEmail,
        provider,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initialize checkout');
    }
    return await res.json();
  } catch (err: any) {
    console.error('Checkout initialization failed:', err);
    return { error: err.message || 'Payment gateway currently unavailable' };
  }
};

export const loadUserProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...createDefaultProfile(),
        ...parsed
      };
    }
  } catch (err) {
    console.error('Failed to load user profile from storage', err);
  }
  return createDefaultProfile(false);
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save user profile to storage', err);
  }
};

export const getPlanLimits = (tier: SubscriptionTier): { limit: number; maxDuration: number } => {
  switch (tier) {
    case 'basic':
      return { limit: 35, maxDuration: 180 };
    case 'plus':
      return { limit: 100, maxDuration: 600 };
    case 'pro':
      return { limit: -1, maxDuration: 1800 };
    case 'free':
    default:
      return { limit: FREE_TIER_LIMITS.monthlyLimit, maxDuration: FREE_TIER_LIMITS.maxDurationSeconds };
  }
};

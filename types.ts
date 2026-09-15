export enum Language {
  BANGLA = 'Bangla',
  HINDI = 'Hindi',
  ENGLISH = 'English'
}

export enum VoiceTone {
  NORMAL = 'Normal',
  PROFESSIONAL = 'Professional',
  SOFT = 'Soft'
}

export enum VoiceEmotion {
  NEUTRAL = 'Neutral',
  HAPPY = 'Happy',
  SAD = 'Sad',
  ANGRY = 'Angry',
  EXCITED = 'Excited',
  SERIOUS = 'Serious'
}

export enum SpeechSpeed {
  SLOW = 'Slow',
  NORMAL = 'Normal',
  FAST = 'Fast'
}

export enum VoiceCharacter {
  KORE = 'Kore',
  PUCK = 'Puck',
  CHARON = 'Charon',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr',
  AOEDE = 'Aoede',
  EOS = 'Eos',
  CHILD_GIRL = 'Child Girl',
  CHILD_BOY = 'Child Boy'
}

export interface TTSConfig {
  language: Language;
  tone: VoiceTone;
  emotion: VoiceEmotion;
  speed: SpeechSpeed;
  voiceCharacter: VoiceCharacter;
  text: string;
  bgmConfig?: BGMConfig;
  clonedVoiceData?: {
    data: string; // Base64
    mimeType: string;
    fileName: string;
  };
}

export type BGMTrack = 'none' | 'acoustic' | 'lofi' | 'cinematic' | 'zen' | 'custom';

export interface BGMConfig {
  track: BGMTrack;
  volume: number; // 0.05 to 0.50 (default: 0.18)
  customFileName?: string;
  customAudioBuffer?: AudioBuffer | null;
}

export type ExportFormat = 'wav' | 'mp3';

export interface VoicePreset {
  id: string;
  name: string;
  config: Omit<TTSConfig, 'text' | 'clonedVoiceData'>;
  createdAt?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  language: Language;
  voiceCharacter: VoiceCharacter;
  tone: VoiceTone;
  emotion: VoiceEmotion;
  speed: SpeechSpeed;
  bgmTrack: BGMTrack;
  duration: number; // in seconds
  audioBlob: Blob;
  audioBuffer?: AudioBuffer | null;
}

export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';

export type PaymentVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface ManualPaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  tier: SubscriptionTier;
  planName: string;
  planPrice: string;
  method: 'bKash' | 'Binance Pay';
  trxId: string;
  senderDetails: string; // Phone last 4 digits (bKash) or Pay ID (Binance)
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email: string;
  avatar: string;
  isGoogleUser: boolean;
  tier: SubscriptionTier;
  creditsUsed: number;
  monthlyLimit: number; // 10 for free, 35 for basic, 100 for plus, -1 for pro
  maxDurationSeconds: number; // 30 for free, 180 for basic, 600 for plus, 1800 for pro
  billingCycleEnd?: string;
  paymentStatus?: PaymentVerificationStatus;
  pendingPaymentTier?: SubscriptionTier;
  pendingPaymentMethod?: 'bKash' | 'Binance Pay';
  pendingPaymentTrxId?: string;
  pendingPaymentSubmittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  monthlyGenerations: string;
  generationsLimit: number;
  maxDurationLabel: string;
  maxDurationSeconds: number;
  badge?: string;
  highlight?: boolean;
  description: string;
  features: string[];
}

export interface AudioState {
  isPlaying: boolean;
  isGenerating: boolean;
  audioBuffer: AudioBuffer | null;
  error: string | null;
  currentTime?: number;
  duration?: number;
}
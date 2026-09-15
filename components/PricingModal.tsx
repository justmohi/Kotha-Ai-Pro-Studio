import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Crown, 
  Clock, 
  AlertCircle, 
  RotateCcw,
  Coins,
  ArrowRight
} from 'lucide-react';
import { SubscriptionTier, UserProfile } from '../types';
import { PRICING_PLANS } from '../services/authService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onSelectPlan: (tier: SubscriptionTier) => void;
  onOpenManualPayment: (tier: SubscriptionTier) => void;
  triggerReason?: 'credits_exhausted' | 'duration_exceeded' | 'manual' | null;
  exceededDurationSeconds?: number;
  onResetCredits?: () => void;
  user?: UserProfile;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectPlan,
  onOpenManualPayment,
  triggerReason = 'manual',
  exceededDurationSeconds,
  onResetCredits,
  user
}) => {
  if (!isOpen) return null;

  const handlePlanClick = (tier: SubscriptionTier) => {
    if (tier === 'free') {
      onSelectPlan('free');
      onClose();
    } else {
      onOpenManualPayment(tier);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-6"
        >
          {/* Header Banner */}
          <div className="bg-radial from-slate-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 relative overflow-hidden">
            {/* Background ambient orbs */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  Kotha Studio Subscriptions
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  Unlock Studio Voice Synthesis
                </h2>
                <p className="text-sm text-slate-300 mt-1 max-w-xl">
                  Choose a plan tailored to your production workflow. Generate longer narratives, access cinematic background music, and unlock priority rendering.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onResetCredits && (
                  <button
                    type="button"
                    onClick={onResetCredits}
                    title="Reset demo credits to 0 for testing"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl transition-all border border-white/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Credits (Demo)
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contextual Warning Trigger if triggered by limit */}
            {triggerReason === 'credits_exhausted' && (
              <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Monthly Free Limit Reached (10/10 clips).</strong> You've used all 10 free generation credits for this month. Upgrade below to immediately restore production.
                </span>
              </div>
            )}

            {triggerReason === 'duration_exceeded' && (
              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Duration Limit Exceeded (~{exceededDurationSeconds ? Math.round(exceededDurationSeconds) : '35+'}s script).</strong> The Free tier supports up to 30 seconds per generation. Choose Basic (up to 3 min), Plus (up to 10 min), or Pro (up to 30 min).
                </span>
              </div>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="p-6 md:p-8 bg-slate-50/50">
            {/* Manual Payment Information Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Manual Payment & Admin Verification System
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select any plan below to submit payment via bKash or Binance Pay for immediate verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                    bKash: +8801931379497
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Binance Pay UID: 180796156
                  </span>
                </div>
              </div>

              {user?.paymentStatus === 'pending' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  <span>
                    <strong>Payment Pending Verification:</strong> Your submitted payment proof for the {user.pendingPaymentTier?.toUpperCase() || 'requested'} Plan is under review. Your subscription will activate upon admin approval.
                  </span>
                </div>
              )}
            </div>

            {/* Free Tier quick pill comparison */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 font-black text-slate-700 uppercase tracking-wider text-[10px]">
                  Free Plan
                </span>
                <span className="text-slate-600 font-medium">
                  10 free generations / month • Max 30 seconds per generation • Standard voice library
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentTier === 'free' ? (
                  <span className="text-emerald-700 bg-emerald-50 font-bold px-3 py-1 rounded-full border border-emerald-200 text-xs">
                    Current Active Plan
                  </span>
                ) : (
                  <button
                    onClick={() => handlePlanClick('free')}
                    className="text-slate-500 hover:text-slate-800 underline font-semibold text-xs"
                  >
                    Switch to Free
                  </button>
                )}
              </div>
            </div>

            {/* 3 Main Paid Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PRICING_PLANS.map((plan) => {
                const isCurrent = currentTier === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl flex flex-col justify-between transition-all relative ${
                      plan.highlight
                        ? 'bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-100 md:-translate-y-1'
                        : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-300" />
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Title & Price */}
                      <div className="mb-4">
                        <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plan.description}</p>
                      </div>

                      <div className="flex items-baseline gap-1 my-4">
                        <span className="text-3xl font-black text-slate-950 tracking-tight">{plan.price}</span>
                        <span className="text-xs font-semibold text-slate-400">{plan.period}</span>
                      </div>

                      {/* Key limits metric chips */}
                      <div className="space-y-2 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                            <Zap className="w-3.5 h-3.5 text-indigo-500" />
                            Generations:
                          </span>
                          <span className="font-bold text-slate-900">{plan.monthlyGenerations}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            Clip Duration:
                          </span>
                          <span className="font-bold text-slate-900">{plan.maxDurationLabel}</span>
                        </div>
                      </div>

                      {/* Feature checklist */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action / Subscribe Now button */}
                    <div className="p-6 pt-0 mt-4">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-default flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Current Active Plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlanClick(plan.id)}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 ${
                            plan.highlight
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-98'
                              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200 active:scale-98'
                          }`}
                        >
                          <span>Subscribe Now ({plan.price}/mo)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust and guarantee footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Manual review & instant activation upon verification • 14-day money back guarantee</span>
              </div>
              <div className="text-[11px] text-slate-400">
                bKash: +8801931379497 • Binance Pay UID: 180796156
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

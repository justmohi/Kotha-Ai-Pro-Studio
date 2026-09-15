import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Crown, 
  User, 
  LogOut, 
  Zap, 
  Clock, 
  ChevronDown, 
  CheckCircle,
  RotateCcw,
  Shield,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { UserProfile, SubscriptionTier } from '../types';
import { isAdmin } from '../services/firebase';
import { KothaBrandHeader } from './KothaLogo';

interface HeaderProps {
  user: UserProfile;
  onOpenPricing: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onResetCredits: () => void;
  onOpenAdmin?: () => void;
  pendingApprovalsCount?: number;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onOpenPricing,
  onOpenAuth,
  onSignOut,
  onResetCredits,
  onOpenAdmin,
  pendingApprovalsCount
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUnlimited = user.monthlyLimit === -1;
  const creditsRemaining = isUnlimited ? 'Unlimited' : Math.max(0, user.monthlyLimit - user.creditsUsed);
  const durationLabel = user.maxDurationSeconds < 60 
    ? `Max ${user.maxDurationSeconds}s` 
    : `Max ${Math.round(user.maxDurationSeconds / 60)}m`;

  // Verify and lock admin email strictly to mohistudio95@gmail.com
  const userIsAdmin = Boolean(user.isGoogleUser && user.email?.toLowerCase().trim() === 'mohistudio95@gmail.com');
  const isPaymentPending = user.paymentStatus === 'pending' || !!user.pendingPaymentTier;

  const getTierBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'pro':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black';
      case 'plus':
        return 'bg-indigo-600 text-white font-black';
      case 'basic':
        return 'bg-blue-600 text-white font-black';
      case 'free':
      default:
        return 'bg-slate-200 text-slate-700 font-bold';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-3.5 px-4 md:px-8 sticky top-0 z-40 transition-all shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <KothaBrandHeader monogramSize={42} />

        {/* Action Controls & User Account */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Admin Panel Tab / Navigation Link (Exposed ONLY to mohistudio95@gmail.com) */}
          {userIsAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/40 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all active:scale-98"
              title="Open Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Panel</span>
              {typeof pendingApprovalsCount === 'number' && pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          )}

          {/* Payment Pending Status Alert Pill */}
          {isPaymentPending && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs"
              title="Your manual payment proof is pending admin verification"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden lg:inline">Payment Pending Verification</span>
              <span className="lg:hidden">Pending</span>
            </button>
          )}

          {/* Live Credit & Duration Cap Tracker */}
          <div 
            onClick={onOpenPricing}
            className="cursor-pointer group flex items-center gap-2 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs"
            title="Click to view subscription pricing & limits"
          >
            <div className="flex flex-col text-right">
              <div className="flex items-center gap-1 justify-end">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-black text-slate-800 group-hover:text-indigo-900">
                  {isUnlimited ? (
                    'Credits: Unlimited'
                  ) : (
                    <>Credits Left: <span className={creditsRemaining === 0 ? 'text-rose-600 font-black' : 'text-indigo-600'}>{creditsRemaining}/{user.monthlyLimit}</span></>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 justify-end text-[10px] text-slate-400 font-semibold group-hover:text-indigo-600">
                <Clock className="w-2.5 h-2.5" />
                <span>{durationLabel}</span>
              </div>
            </div>
          </div>

          {/* Upgrade Plan Button */}
          {!isPaymentPending && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="hidden sm:flex items-center gap-1.5 bg-radial from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 active:scale-98 transition-all"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Upgrade Plan</span>
            </button>
          )}

          {/* Authentication & User Profile */}
          {user.isGoogleUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 max-w-[100px] truncate leading-tight">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded-xs self-start ${getTierBadgeColor(user.tier)}`}>
                      {user.tier}
                    </span>
                    {userIsAdmin && (
                      <span className="text-[9px] bg-slate-900 text-amber-300 px-1 rounded-xs font-black uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1 rounded-xs">Google</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Plan & Usage inside Dropdown */}
                  <div className="py-3 border-b border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Subscription:</span>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md ${getTierBadgeColor(user.tier)}`}>
                        {user.tier} Plan
                      </span>
                    </div>

                    {isPaymentPending && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] text-amber-800 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Payment Pending Verification</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>Monthly Usage</span>
                        <span>{isUnlimited ? 'Unlimited' : `${user.creditsUsed} / ${user.monthlyLimit}`}</span>
                      </div>
                      {!isUnlimited && (
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              user.creditsUsed >= user.monthlyLimit ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, (user.creditsUsed / user.monthlyLimit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Menu Items */}
                  <div className="pt-2 space-y-1">
                    {userIsAdmin && onOpenAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left flex items-center justify-between px-2.5 py-2 text-xs font-bold text-slate-900 bg-amber-50 hover:bg-amber-100/70 rounded-xl transition-colors border border-amber-200/60"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span>Admin Panel</span>
                        </div>
                        {typeof pendingApprovalsCount === 'number' && pendingApprovalsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                            {pendingApprovalsCount}
                          </span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenPricing();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <Crown className="w-4 h-4 text-indigo-600" />
                      Manage Subscription & Tiers
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onResetCredits();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                      Reset Monthly Credits (Demo)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sign in with Google Button */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

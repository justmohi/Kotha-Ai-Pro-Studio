import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ShieldCheck, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithGoogle } from '../services/firebase';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: Partial<UserProfile>) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real Google Sign In via Firebase Auth Popup
  const handleRealGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userProfile = await signInWithGoogle();
      setIsLoading(false);
      onSuccess(userProfile);
      onClose();
    } catch (err: any) {
      console.error('Firebase Google Sign-In error:', err);
      setIsLoading(false);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled by user. You can try again or enter your account manually.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked by browser. Please allow popups for Google Sign-in or use account form.');
      } else {
        setAuthError(err.message || 'Google authentication failed. Please try again.');
      }
    }
  };

  const handleCustomSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const displayName = customName.trim() || customEmail.split('@')[0];
      const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
      onSuccess({
        id: uid,
        uid,
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: customEmail.trim(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=4f46e5`,
        isGoogleUser: true,
      });
      onClose();
    }, 500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        >
          {/* Top Google Header bar */}
          <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Sign in with Google</h3>
                <p className="text-xs text-slate-500">to continue to Kotha Voice Studio</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{authError}</p>
                </div>
              </div>
            )}

            {!isCustomMode ? (
              <>
                {/* Account card option */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sign in with Google OAuth</p>
                  
                  <button
                    onClick={handleRealGoogleSignIn}
                    disabled={isLoading}
                    className="w-full text-left p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-600 transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">Continue with Google</p>
                        <p className="text-xs text-slate-500 truncate">Authenticates via official Google popup</p>
                      </div>
                    </div>
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute">or custom account</span>
                </div>

                {/* Sign in with custom account */}
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-slate-300 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  Enter Account Details Manually
                </button>
              </>
            ) : (
              /* Custom Account Form */
              <form onSubmit={handleCustomSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Email Address</label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="w-1/2 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-1/2 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Privacy note */}
            <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                To continue, Google will share your name, email address, language preference, and profile picture with Kotha AI.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Copy, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  Coins,
  ArrowRight,
  ArrowLeft,
  User,
  Mail
} from 'lucide-react';
import { SubscriptionTier, UserProfile, ManualPaymentRequest } from '../types';
import { PRICING_PLANS } from '../services/authService';
import { submitManualPaymentRequest } from '../services/firebase';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: SubscriptionTier;
  user: UserProfile;
  onPaymentSubmitted: (request: ManualPaymentRequest) => void;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  isOpen,
  onClose,
  selectedTier,
  user,
  onPaymentSubmitted
}) => {
  const [method, setMethod] = useState<'bKash' | 'Binance Pay'>('bKash');
  
  // Form fields
  const [bKashTrxId, setBKashTrxId] = useState('');
  const [bKashSenderDigits, setBKashSenderDigits] = useState('');
  const [binancePayId, setBinancePayId] = useState('');
  const [userEmail, setUserEmail] = useState(user.email || '');
  
  // UI states
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Close modal when Escape key is pressed
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plan = PRICING_PLANS.find(p => p.id === selectedTier) || PRICING_PLANS[1];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailToUse = userEmail.trim() || user.email;
    if (!emailToUse || !emailToUse.includes('@')) {
      setFormError('Please provide a valid account email address so the admin can identify your subscription.');
      return;
    }

    let finalTrxId = '';
    let finalSenderDetails = '';

    if (method === 'bKash') {
      if (!bKashTrxId.trim()) {
        setFormError('Please enter your bKash Transaction ID (TrxID).');
        return;
      }
      if (!bKashSenderDigits.trim() || bKashSenderDigits.trim().length < 4) {
        setFormError('Please enter the last 4 digits of your bKash sender number.');
        return;
      }
      finalTrxId = bKashTrxId.trim().toUpperCase();
      finalSenderDetails = `Last 4 digits: ${bKashSenderDigits.trim().slice(-4)}`;
    } else {
      if (!binancePayId.trim()) {
        setFormError('Please enter your Binance Transaction ID / Pay ID.');
        return;
      }
      finalTrxId = binancePayId.trim();
      finalSenderDetails = `Binance Pay ID / Trx: ${binancePayId.trim()}`;
    }

    setIsSubmitting(true);

    const newRequest: ManualPaymentRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid || user.id || 'usr_' + Date.now(),
      userEmail: emailToUse,
      userName: user.name || 'Studio Creator',
      tier: selectedTier,
      planName: plan.name,
      planPrice: plan.price,
      method,
      trxId: finalTrxId,
      senderDetails: finalSenderDetails,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await submitManualPaymentRequest(newRequest);
      setIsSubmitting(false);
      setIsSuccess(true);
      onPaymentSubmitted(newRequest);
    } catch (err: any) {
      console.error('Manual payment submission error:', err);
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to submit payment details. Please retry.');
    }
  };

  return (
    <div 
      id="manual-payment-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        id="manual-payment-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="cursor-default bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] relative my-auto scrollbar-thin"
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-slate-900 text-white p-5 sm:p-6 z-20 border-b border-slate-800 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Manual Payment
                </span>
                <span className="text-xs text-slate-400 font-semibold">•</span>
                <span className="text-xs text-slate-300 font-medium">Step 2 of 2</span>
              </div>

              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
                <span>Subscribe to {plan.name}</span>
                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">
                  {plan.price}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Send payment using bKash or Binance Pay, then submit your transaction proof below.
              </p>
            </div>

            <button
              type="button"
              id="close-manual-payment-btn"
              onClick={onClose}
              aria-label="Close dialog"
              title="Close (Esc)"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-600/80 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer ml-1 hover:scale-105"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isSuccess ? (
            /* Pending State & Confirmation Screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-in zoom-in-90">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Payment Pending Verification
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Payment Proof Submitted!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your payment proof has been submitted! Your subscription will be activated after admin verification.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Selected Plan:</span>
                  <span className="font-bold text-slate-800 uppercase">{plan.name}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Payment Method:</span>
                  <span className="font-bold text-slate-800">{method}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Account Email:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {userEmail || user.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">TrxID:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {method === 'bKash' ? bKashTrxId.toUpperCase() : binancePayId}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Return to Studio
              </button>
            </div>
          ) : (
            /* Payment Selection & Submission Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* bKash Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('bKash');
                      setFormError(null);
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                      method === 'bKash'
                        ? 'border-pink-600 bg-pink-50/50 shadow-sm text-pink-900'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                      bK
                    </div>
                    <span className="text-xs font-black">bKash</span>
                    <span className="text-[10px] text-pink-700/80 font-semibold">Personal Send Money</span>
                  </button>

                  {/* Binance Pay Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('Binance Pay');
                      setFormError(null);
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                      method === 'Binance Pay'
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm text-amber-950'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-xs shadow-2xs">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black">Binance Pay</span>
                    <span className="text-[10px] text-amber-800/80 font-semibold">Pay via UID</span>
                  </button>
                </div>
              </div>

              {/* Instructions Banner based on selected method */}
              {method === 'bKash' ? (
                <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-950">Payment Instructions:</span>
                    <span className="text-[10px] bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full font-bold">
                      bKash Personal
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-pink-900 leading-relaxed">
                    Send Money to bKash Number: <span className="font-mono font-black text-pink-700 select-all">+8801931379497</span> (Personal)
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy('+8801931379497', 'bKash')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-white hover:bg-pink-100/70 border border-pink-300 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                    >
                      {copiedText === 'bKash' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied +8801931379497!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy bKash Number</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-pink-600 font-medium">Use "Send Money"</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950">Payment Instructions:</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Binance Pay
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                    Pay via Binance Pay UID: <span className="font-mono font-black text-amber-950 select-all">180796156</span>
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy('180796156', 'Binance')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                    >
                      {copiedText === 'Binance' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied UID: 180796156!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Binance UID</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-amber-700 font-medium">Instant transfer</span>
                  </div>
                </div>
              )}

              {/* Account Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 outline-hidden transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  This email will receive the subscription upgrade upon admin approval.
                </p>
              </div>

              {/* Method Specific Fields */}
              {method === 'bKash' ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Transaction ID (TrxID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bKashTrxId}
                      onChange={(e) => setBKashTrxId(e.target.value)}
                      placeholder="e.g. 9J8A7K3L2M"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-pink-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden transition-all uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Sender Phone Number (Last 4 digits) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={bKashSenderDigits}
                        onChange={(e) => setBKashSenderDigits(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 4821"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-pink-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden transition-all"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Binance Transaction ID / Pay ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value)}
                    placeholder="e.g. 293847561 or TxHash"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden transition-all"
                  />
                </div>
              )}

              {/* Error Alert */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <p className="font-semibold">{formError}</p>
                </div>
              )}

              {/* Action Controls: Go Back & Submit */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="manual-payment-cancel-btn"
                    onClick={onClose}
                    className="w-1/3 sm:w-2/5 py-3 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Cancel / Go Back</span>
                  </button>
                  <button
                    type="submit"
                    id="manual-payment-submit-btn"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-98 text-white text-xs font-black shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting Payment Proof...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-2.5">
                  Verified securely by Studio Admin. Credits will be allocated immediately upon approval.
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Copy, 
  Smartphone, 
  Coins, 
  User, 
  Mail, 
  Calendar,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { ManualPaymentRequest, UserProfile, SubscriptionTier } from '../types';
import { 
  subscribeToPaymentRequests, 
  approvePaymentRequest, 
  rejectPaymentRequest 
} from '../services/firebase';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserUpgraded?: (updatedUser: UserProfile) => void;
}

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpgraded
}) => {
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to real-time payment requests
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToPaymentRequests((updatedList) => {
      setRequests(updatedList);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (req: ManualPaymentRequest) => {
    setIsProcessingId(req.id);
    try {
      const updatedProfile = await approvePaymentRequest(req);
      setIsProcessingId(null);
      showToast(`Approved! ${req.userEmail} upgraded to ${req.tier.toUpperCase()} Plan.`);
      if (updatedProfile && onUserUpgraded) {
        onUserUpgraded(updatedProfile);
      }
    } catch (err: any) {
      console.error('Approval failed:', err);
      setIsProcessingId(null);
      showToast(`Error: ${err.message || 'Approval failed'}`);
    }
  };

  const handleReject = async (req: ManualPaymentRequest) => {
    setIsProcessingId(req.id);
    try {
      await rejectPaymentRequest(req);
      setIsProcessingId(null);
      showToast(`Request from ${req.userEmail} marked as Rejected.`);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setIsProcessingId(null);
      showToast(`Error: ${err.message || 'Rejection failed'}`);
    }
  };

  // Metrics
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalCount = requests.length;

  // Filtered requests
  const filteredRequests = requests.filter(req => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.userEmail.toLowerCase().includes(q) ||
        req.trxId.toLowerCase().includes(q) ||
        req.method.toLowerCase().includes(q) ||
        req.tier.toLowerCase().includes(q) ||
        req.senderDetails.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'pro':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'plus':
        return 'bg-indigo-600 text-white';
      case 'basic':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto relative"
      >
        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
            {toastMessage}
          </div>
        )}

        {/* Modal Header */}
        <div className="bg-radial from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">Admin Payment Verification</h2>
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-bold">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Review submitted manual payments and instantly activate customer subscriptions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                {currentUser.email || 'mohistudio95@gmail.com'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats & Filters Bar */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 space-y-4 shrink-0">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setFilterStatus('pending')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
                <span>Pending Approvals</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-black text-amber-950">{pendingCount}</p>
            </div>

            <div 
              onClick={() => setFilterStatus('approved')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                filterStatus === 'approved'
                  ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                <span>Approved</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-950">{approvedCount}</p>
            </div>

            <div 
              onClick={() => setFilterStatus('rejected')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                filterStatus === 'rejected'
                  ? 'bg-rose-500/10 border-rose-400 ring-2 ring-rose-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-rose-800 font-bold mb-1">
                <span>Rejected</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-xl font-black text-rose-950">{rejectedCount}</p>
            </div>

            <div 
              onClick={() => setFilterStatus('all')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                filterStatus === 'all'
                  ? 'bg-indigo-500/10 border-indigo-400 ring-2 ring-indigo-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-indigo-800 font-bold mb-1">
                <span>Total Requests</span>
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p className="text-xl font-black text-indigo-950">{totalCount}</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user email, TrxID, sender details, or plan..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 outline-hidden transition-all shadow-2xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                    filterStatus === status
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status}
                  {status === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No payment requests found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {filterStatus === 'pending'
                  ? 'All pending manual payment requests have been verified.'
                  : 'There are no submissions matching your current filter.'}
              </p>
            </div>
          ) : (
            <>
              {/* Structured Desktop Table (Visible on md and larger screens) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">TrxID</th>
                      <th className="py-3 px-4">Sender Details</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* User Email */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[160px]">
                                {req.userName || 'User'}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                                {req.userEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[10px] uppercase font-black px-2 py-0.5 rounded-md shadow-2xs ${getTierColor(req.tier)}`}>
                            {req.tier} (${req.planPrice})
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            {req.method === 'bKash' ? (
                              <>
                                <span className="w-4 h-4 rounded-full bg-pink-600 text-white text-[9px] font-black flex items-center justify-center">bK</span>
                                <span className="text-pink-900 font-bold">bKash</span>
                              </>
                            ) : (
                              <>
                                <Coins className="w-4 h-4 text-amber-500" />
                                <span className="text-amber-950 font-bold">Binance Pay</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* TrxID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{req.trxId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(req.trxId, req.id)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded-sm transition-colors"
                              title="Copy TrxID"
                            >
                              {copiedId === req.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Sender Details */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          <span className="truncate max-w-[150px] block">{req.senderDetails}</span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {formatTimestamp(req.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReject(req)}
                                disabled={isProcessingId === req.id}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reject</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApprove(req)}
                                disabled={isProcessingId === req.id}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs shadow-emerald-200 transition-all flex items-center gap-1"
                              >
                                {isProcessingId === req.id ? (
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Approve</span>
                              </button>
                            </div>
                          ) : req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Rejected
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApprove(req)}
                                disabled={isProcessingId === req.id}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                              >
                                Re-approve
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (Visible on small screens) */}
              <div className="md:hidden space-y-3.5">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-slate-300 hover:shadow-2xs space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {req.userName || 'User'}
                          </p>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded-xs font-black ${getTierColor(req.tier)}`}>
                            {req.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{req.userEmail}</p>
                      </div>

                      <div>
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            Pending
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Method</span>
                        <span className="font-bold text-slate-800">{req.method}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">TrxID</span>
                        <span className="font-mono font-bold text-slate-900 truncate block">{req.trxId}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Sender</span>
                        <span className="font-medium text-slate-700 truncate block">{req.senderDetails}</span>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">{formatTimestamp(req.createdAt)}</span>
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(req)}
                            disabled={isProcessingId === req.id}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            disabled={isProcessingId === req.id}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black shadow-xs"
                          >
                            Approve
                          </button>
                        </div>
                      ) : req.status === 'rejected' ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="text-xs font-bold text-indigo-600"
                        >
                          Re-approve
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Admin Access Verified: <strong className="text-slate-900 font-mono">mohistudio95@gmail.com</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 font-bold transition-all shadow-2xs"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

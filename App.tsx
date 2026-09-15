import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertCircle, 
  Mic2,
} from 'lucide-react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import PresetManager from './components/PresetManager';
import AudioVisualizer from './components/AudioVisualizer';
import HistoryPanel from './components/HistoryPanel';
import ScriptEditor from './components/ScriptEditor';
import { PricingModal } from './components/PricingModal';
import { ManualPaymentModal } from './components/ManualPaymentModal';
import { AdminVerificationModal } from './components/AdminVerificationModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { KothaMonogram } from './components/KothaLogo';
import { 
  Language, 
  VoiceTone, 
  SpeechSpeed, 
  VoiceCharacter, 
  VoiceEmotion, 
  TTSConfig, 
  AudioState, 
  VoicePreset, 
  HistoryItem,
  UserProfile,
  SubscriptionTier,
  ManualPaymentRequest
} from './types';
import { 
  loadUserProfile, 
  saveUserProfile, 
  getPlanLimits 
} from './services/authService';
import { 
  auth, 
  saveUserProfileToFirestore, 
  subscribeToUserProfile, 
  logOutFirebase,
  subscribeToPaymentRequests,
  isAdmin
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { generateSpeech } from './services/geminiTTS';
import { audioBufferToWav } from './components/audioUtils';
import { 
  getHistoryItems, 
  saveHistoryItem, 
  deleteHistoryItem, 
  clearAllHistory 
} from './services/historyService';

const PRESETS_STORAGE_KEY = 'kotha_ai_voice_presets_v3';

const App: React.FC = () => {
  const [config, setConfig] = useState<TTSConfig>({
    language: Language.BANGLA,
    tone: VoiceTone.PROFESSIONAL,
    emotion: VoiceEmotion.NEUTRAL,
    speed: SpeechSpeed.NORMAL,
    voiceCharacter: VoiceCharacter.KORE,
    text: '',
    bgmConfig: {
      track: 'none',
      volume: 0.18,
    }
  });

  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // User Authentication & Subscription State
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedManualPaymentTier, setSelectedManualPaymentTier] = useState<SubscriptionTier | null>(null);
  const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pricingTriggerReason, setPricingTriggerReason] = useState<'credits_exhausted' | 'duration_exceeded' | 'manual' | null>(null);
  const [exceededDuration, setExceededDuration] = useState<number | undefined>(undefined);

  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isGenerating: false,
    audioBuffer: null,
    error: null,
  });

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playStartOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Load Presets & History on initial mount
  useEffect(() => {
    const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    }

    getHistoryItems().then(items => {
      setHistoryItems(items);
    }).catch(err => {
      console.error("Failed to load history items", err);
    });
  }, []);

  // Listen for payment return callbacks & sync with Firestore
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const upgradedTier = params.get('tier') as SubscriptionTier | null;
    if (paymentStatus === 'success' && upgradedTier && ['basic', 'plus', 'pro'].includes(upgradedTier)) {
      handleSelectPlan(upgradedTier);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Sync with Firebase Authentication state & Firestore profile document
  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        unsubDoc = subscribeToUserProfile(fbUser.uid, (firestoreProfile) => {
          if (firestoreProfile) {
            setUser(prev => ({
              ...prev,
              ...firestoreProfile,
              uid: fbUser.uid,
              id: fbUser.uid,
              isGoogleUser: true
            }));
            saveUserProfile(firestoreProfile);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Subscribe to pending payments count for Admin Panel badge
  useEffect(() => {
    const isUserAdmin = Boolean(user.isGoogleUser && isAdmin(user.email));
    if (isUserAdmin) {
      const unsub = subscribeToPaymentRequests((requests) => {
        const pending = requests.filter(r => r.status === 'pending').length;
        setPendingApprovalsCount(pending);
      });
      return () => unsub();
    } else {
      setPendingApprovalsCount(0);
    }
  }, [user.isGoogleUser, user.email]);

  // Save Presets to localStorage
  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  // Clean up Web Audio resources on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Stop active playback safely
  const stopPlayback = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  };

  // Play audio buffer from a given start offset
  const playAudio = (buffer: AudioBuffer, startOffset: number = 0) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopPlayback();

    // Initialize Analyser and Gain nodes
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
    }
    if (!gainNodeRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gainNodeRef.current = gain;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    source.connect(gainNodeRef.current);
    gainNodeRef.current.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    const safeOffset = Math.max(0, Math.min(startOffset, Math.max(0, buffer.duration - 0.05)));
    playStartTimeRef.current = ctx.currentTime;
    playStartOffsetRef.current = safeOffset;
    setCurrentTime(safeOffset);
    setDuration(buffer.duration);

    source.onended = () => {
      if (audioSourceRef.current === source) {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
        setCurrentTime(buffer.duration);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      }
    };

    source.start(0, safeOffset);
    audioSourceRef.current = source;
    setAudioState(prev => ({ ...prev, isPlaying: true }));

    // Real-time animation loop for progress bar
    const updateProgress = () => {
      if (!audioContextRef.current || !audioSourceRef.current) return;
      const elapsed = audioContextRef.current.currentTime - playStartTimeRef.current;
      const current = playStartOffsetRef.current + elapsed;
      if (current >= buffer.duration) {
        setCurrentTime(buffer.duration);
      } else {
        setCurrentTime(current);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handlePlayPause = () => {
    if (audioState.isPlaying) {
      stopPlayback();
    } else if (audioState.audioBuffer) {
      const resumeTime = currentTime >= duration ? 0 : currentTime;
      playAudio(audioState.audioBuffer, resumeTime);
    }
  };

  const handleSeek = (time: number) => {
    if (!audioState.audioBuffer) return;
    setCurrentTime(time);
    if (audioState.isPlaying) {
      playAudio(audioState.audioBuffer, time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(vol, audioContextRef.current.currentTime);
    }
  };

  const handleOpenPricing = (reason: 'credits_exhausted' | 'duration_exceeded' | 'manual' = 'manual', dur?: number) => {
    setPricingTriggerReason(reason);
    setExceededDuration(dur);
    setIsPricingModalOpen(true);
  };

  const handleOpenManualPayment = (tier: SubscriptionTier) => {
    setSelectedManualPaymentTier(tier);
    setIsPricingModalOpen(false);
    setIsManualPaymentModalOpen(true);
  };

  const handlePaymentSubmitted = (request: ManualPaymentRequest) => {
    const updatedUser: UserProfile = {
      ...user,
      paymentStatus: 'pending',
      pendingPaymentTier: request.tier,
      pendingTrxId: request.trxId
    };
    setUser(updatedUser);
    saveUserProfile(updatedUser);
    if (updatedUser.uid || updatedUser.id) {
      saveUserProfileToFirestore(updatedUser).catch(e => console.warn('Firestore update note:', e));
    }
  };

  const handleSelectPlan = (tier: SubscriptionTier) => {
    const { limit, maxDuration } = getPlanLimits(tier);
    const updated: UserProfile = {
      ...user,
      tier,
      monthlyLimit: limit,
      maxDurationSeconds: maxDuration,
      // If switching to a higher tier or same tier, retain or reset credits
      creditsUsed: tier === user.tier ? user.creditsUsed : 0
    };
    setUser(updated);
    saveUserProfile(updated);
    if (updated.uid || updated.id) {
      saveUserProfileToFirestore(updated).catch(e => console.warn('Firestore sync note:', e));
    }
  };

  const handleSignInSuccess = (userData: Partial<UserProfile>) => {
    const updated: UserProfile = {
      ...user,
      ...userData,
      isGoogleUser: true
    };
    setUser(updated);
    saveUserProfile(updated);
    if (updated.uid || updated.id) {
      saveUserProfileToFirestore(updated).catch(e => console.warn('Firestore sync note:', e));
    }
  };

  const handleSignOut = async () => {
    try {
      await logOutFirebase();
    } catch (e) {
      console.warn('Firebase logout note:', e);
    }
    const defaultGuest: UserProfile = {
      ...user,
      uid: undefined,
      name: 'Guest Creator',
      email: '',
      avatar: '',
      isGoogleUser: false,
      tier: 'free',
      monthlyLimit: 10,
      maxDurationSeconds: 30,
      creditsUsed: Math.min(user.creditsUsed, 10)
    };
    setUser(defaultGuest);
    saveUserProfile(defaultGuest);
  };

  const handleResetCredits = () => {
    const updated: UserProfile = {
      ...user,
      creditsUsed: 0
    };
    setUser(updated);
    saveUserProfile(updated);
    if (updated.uid || updated.id) {
      saveUserProfileToFirestore(updated).catch(e => console.warn('Firestore sync note:', e));
    }
  };

  const handleGenerate = async () => {
    if (!config.text.trim()) {
      setAudioState(prev => ({ ...prev, error: "Please enter some text to convert." }));
      return;
    }

    // 1. Check Monthly Generation Limit
    if (user.monthlyLimit !== -1 && user.creditsUsed >= user.monthlyLimit) {
      handleOpenPricing('credits_exhausted');
      return;
    }

    // 2. Check Duration Limit Cap
    const cleanSpoken = config.text.replace(/\[(emphasize|whisper|loud)\]([\s\S]*?)\[\/\1\]/gi, '$2')
                                   .replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, ' ');
    const words = cleanSpoken.trim().split(/\s+/).filter(Boolean).length;
    let wpm = 130;
    if (config.speed === SpeechSpeed.SLOW) wpm = 95;
    if (config.speed === SpeechSpeed.FAST) wpm = 175;
    let estSec = (words / wpm) * 60;
    const pauseRegex = /\[(?:pause|বিরতি)\s*([\d\.\u09E6-\u09EF]+)\s*(s|ms|sec|seconds?|সেকেন্ড)?\]/gi;
    let match;
    while ((match = pauseRegex.exec(config.text)) !== null) {
      const rawVal = match[1];
      const unit = (match[2] || 's').toLowerCase();
      const val = parseFloat(rawVal);
      if (!isNaN(val)) {
        estSec += unit.startsWith('m') ? val / 1000 : val;
      }
    }

    if (estSec > user.maxDurationSeconds) {
      handleOpenPricing('duration_exceeded', estSec);
      return;
    }

    stopPlayback();
    setAudioState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: null, 
      isPlaying: false,
      audioBuffer: null 
    }));
    setCurrentTime(0);
    setDuration(0);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const buffer = await generateSpeech(config, audioContextRef.current);
      
      // Deduct credit upon successful speech synthesis
      if (user.monthlyLimit !== -1) {
        const updatedUser: UserProfile = {
          ...user,
          creditsUsed: user.creditsUsed + 1
        };
        setUser(updatedUser);
        saveUserProfile(updatedUser);
        if (updatedUser.uid || updatedUser.id) {
          saveUserProfileToFirestore(updatedUser).catch(e => console.warn('Firestore credit sync:', e));
        }
      }

      setAudioState(prev => ({ 
        ...prev, 
        audioBuffer: buffer, 
        isGenerating: false 
      }));
      setDuration(buffer.duration);
      setCurrentTime(0);

      // Play immediately
      playAudio(buffer, 0);

      // Save to History (IndexedDB)
      try {
        const wavBlob = audioBufferToWav(buffer);
        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text: config.text,
          language: config.language,
          voiceCharacter: config.voiceCharacter,
          tone: config.tone,
          emotion: config.emotion,
          speed: config.speed,
          bgmTrack: config.bgmConfig?.track !== 'none' ? config.bgmConfig?.track : undefined,
          duration: buffer.duration,
          audioBlob: wavBlob,
        };
        await saveHistoryItem(newItem);
        const updated = await getHistoryItems();
        setHistoryItems(updated);
      } catch (histErr) {
        console.warn("Failed to persist to history:", histErr);
      }

    } catch (err: any) {
      setAudioState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: err.message || "Something went wrong during speech synthesis." 
      }));
    }
  };

  const handleSavePreset = (name: string) => {
    const newPreset: VoicePreset = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      config: {
        language: config.language,
        tone: config.tone,
        emotion: config.emotion,
        speed: config.speed,
        voiceCharacter: config.voiceCharacter,
        bgmConfig: config.bgmConfig,
      },
    };
    setPresets(prev => [newPreset, ...prev]);
  };

  const handleLoadPreset = (preset: VoicePreset) => {
    const newConfig = { ...config, ...preset.config };
    delete newConfig.clonedVoiceData;
    setConfig(newConfig);
  };

  const handleDeletePreset = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const handleRenamePreset = (id: string, newName: string) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleResetToDefault = () => {
    setConfig(prev => ({
      ...prev,
      language: Language.BANGLA,
      tone: VoiceTone.PROFESSIONAL,
      emotion: VoiceEmotion.NEUTRAL,
      speed: SpeechSpeed.NORMAL,
      voiceCharacter: VoiceCharacter.KORE,
      bgmConfig: {
        track: 'none',
        volume: 0.18,
      },
      clonedVoiceData: undefined
    }));
  };

  // History handlers
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setConfig(prev => ({
      ...prev,
      text: item.text,
      language: item.language,
      voiceCharacter: item.voiceCharacter,
      tone: item.tone,
      emotion: item.emotion,
      speed: item.speed,
      bgmConfig: {
        track: item.bgmTrack || 'none',
        volume: prev.bgmConfig?.volume ?? 0.18
      }
    }));
    // Scroll smoothly to editor
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItem(id);
    const updated = await getHistoryItems();
    setHistoryItems(updated);
  };

  const handleClearAllHistory = async () => {
    if (window.confirm("Are you sure you want to clear all generation history?")) {
      await clearAllHistory();
      setHistoryItems([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        user={user}
        onOpenPricing={() => handleOpenPricing('manual')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onResetCredits={handleResetCredits}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
      />
      
      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 space-y-6"
        >
          {/* Script Editor Card */}
          <ScriptEditor
            text={config.text}
            language={config.language}
            speed={config.speed}
            isGenerating={audioState.isGenerating}
            onTextChange={(newText) => setConfig(prev => ({ ...prev, text: newText }))}
            onGenerate={handleGenerate}
            voiceCharacter={config.voiceCharacter}
            isClonedVoice={Boolean(config.clonedVoiceData)}
            user={user}
            onTriggerUpgrade={handleOpenPricing}
          />

          {/* Advanced Audio Player & Visualizer */}
          <AnimatePresence mode="wait">
            {audioState.error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {audioState.error}
              </motion.div>
            ) : (audioState.audioBuffer || audioState.isGenerating) ? (
              <motion.div 
                key="player"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <AudioVisualizer 
                  isPlaying={audioState.isPlaying}
                  isGenerating={audioState.isGenerating}
                  audioBuffer={audioState.audioBuffer}
                  analyserNode={analyserRef.current}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                  voiceLabel={config.clonedVoiceData ? 'Custom Cloned Voice' : `${config.voiceCharacter} Voice Output`}
                  subLabel={`${config.language === Language.BANGLA ? 'Bengali' : config.language} • ${config.tone} • ${config.emotion} • ${config.speed}${config.bgmConfig?.track && config.bgmConfig.track !== 'none' ? ` • BGM: ${config.bgmConfig.track}` : ''}`}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Recent History Panel */}
          <HistoryPanel
            items={historyItems}
            onLoadItem={handleLoadHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
          />
          
          {/* Pro Tips & Preset Manager Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Pro Tips
              </h3>
              <ul className="space-y-3 text-xs text-slate-500 font-medium">
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>Use <strong>[pause 1s]</strong> or <strong>[pause 2s]</strong> anywhere in your script for theatrical pauses.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>Select <strong>Soft Acoustic</strong> or <strong>Chill Lo-Fi</strong> in BGM to produce ready-to-publish podcast takes.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>For Bengali, standard spelling produces natural pronunciation and cadence.</span>
                </li>
              </ul>
            </div>
            
            <PresetManager 
              currentConfig={config} 
              presets={presets} 
              onSave={handleSavePreset} 
              onLoad={handleLoadPreset}
              onDelete={handleDeletePreset}
              onRename={handleRenamePreset}
              isGenerating={audioState.isGenerating}
            />
          </div>
        </motion.div>

        {/* Right Sidebar Control Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 space-y-6"
        >
          <ControlPanel 
            config={config} 
            onChange={setConfig} 
            isGenerating={audioState.isGenerating}
            onResetToDefault={handleResetToDefault}
          />
        </motion.div>
      </main>
      
      <footer className="py-8 px-6 border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <KothaMonogram size={28} />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-none">Kotha</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">AI Voice Studio</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">© 2026 Kotha AI. Professional Bangla AI Voice Engine.</p>
          <div className="flex gap-6">
            <span className="text-xs font-bold text-slate-400">MP3 & WAV Studio Quality</span>
          </div>
        </div>
      </footer>

      {/* Subscription Pricing Tiers & Upgrade Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentTier={user.tier}
        onSelectPlan={handleSelectPlan}
        onOpenManualPayment={handleOpenManualPayment}
        triggerReason={pricingTriggerReason}
        exceededDurationSeconds={exceededDuration}
        onResetCredits={handleResetCredits}
        user={user}
      />

      {/* Manual Payment Submission Modal (bKash & Binance Pay) */}
      <ManualPaymentModal
        isOpen={isManualPaymentModalOpen}
        onClose={() => setIsManualPaymentModalOpen(false)}
        selectedTier={selectedManualPaymentTier || 'plus'}
        user={user}
        onPaymentSubmitted={handlePaymentSubmitted}
      />

      {/* Admin Verification Dashboard */}
      <AdminVerificationModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={user}
        onUserUpgraded={(updatedProfile) => {
          setUser(updatedProfile);
          saveUserProfile(updatedProfile);
        }}
      />

      {/* Google Authentication Sign-In Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
};

export default App;

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  Fingerprint, 
  Info, 
  FileAudio, 
  XCircle, 
  Upload, 
  User, 
  Smile, 
  Radio, 
  Zap,
  ChevronDown,
  ChevronUp,
  Volume2,
  Settings2,
  Music,
  Play,
  Pause,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { Language, VoiceTone, SpeechSpeed, VoiceCharacter, VoiceEmotion, TTSConfig, BGMTrack } from '../types';
import { getBGMBuffer } from '../services/bgmGenerator';

interface ControlPanelProps {
  config: TTSConfig;
  onChange: (config: TTSConfig) => void;
  isGenerating: boolean;
  onResetToDefault?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, isGenerating, onResetToDefault }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBgmInputRef = useRef<HTMLInputElement>(null);
  const [showCloningGuide, setShowCloningGuide] = useState(false);
  const [previewingTrack, setPreviewingTrack] = useState<BGMTrack | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);

  const currentBGMTrack: BGMTrack = config.bgmConfig?.track || 'none';
  const currentBGMVolume: number = config.bgmConfig?.volume ?? 0.18;

  useEffect(() => {
    return () => {
      if (previewSourceRef.current) {
        previewSourceRef.current.stop();
      }
      if (previewCtxRef.current) {
        previewCtxRef.current.close();
      }
    };
  }, []);

  const updateConfig = (key: keyof TTSConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const updateBGMConfig = (updates: Partial<{ track: BGMTrack; volume: number; customFileName?: string; customAudioBuffer?: AudioBuffer | null }>) => {
    const existing = config.bgmConfig || { track: 'none', volume: 0.18 };
    onChange({
      ...config,
      bgmConfig: {
        ...existing,
        ...updates
      }
    });
  };

  const handlePreviewBGM = async (track: BGMTrack) => {
    if (previewingTrack === track) {
      if (previewSourceRef.current) {
        previewSourceRef.current.stop();
        previewSourceRef.current = null;
      }
      setPreviewingTrack(null);
      return;
    }

    if (previewSourceRef.current) {
      previewSourceRef.current.stop();
      previewSourceRef.current = null;
    }

    if (track === 'none') {
      setPreviewingTrack(null);
      return;
    }

    try {
      if (!previewCtxRef.current) {
        previewCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = previewCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let buffer: AudioBuffer | null = null;
      if (track === 'custom' && config.bgmConfig?.customAudioBuffer) {
        buffer = config.bgmConfig.customAudioBuffer;
      } else {
        buffer = await getBGMBuffer(track, 30, ctx.sampleRate);
      }

      if (!buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(currentBGMVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      previewSourceRef.current = source;
      setPreviewingTrack(track);

      source.onended = () => {
        setPreviewingTrack(null);
      };
    } catch (err) {
      console.error("Failed to preview BGM:", err);
      setPreviewingTrack(null);
    }
  };

  const handleCustomBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      updateBGMConfig({
        track: 'custom',
        customFileName: file.name,
        customAudioBuffer: audioBuffer
      });
      await ctx.close();
    } catch (err) {
      console.error("Failed to load custom BGM:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      onChange({
        ...config,
        clonedVoiceData: {
          data: base64,
          mimeType: file.type || 'audio/wav',
          fileName: file.name
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const removeClonedVoice = () => {
    const newConfig = { ...config };
    delete newConfig.clonedVoiceData;
    onChange(newConfig);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getEmotionIcon = (emotion: VoiceEmotion) => {
    switch(emotion) {
      case VoiceEmotion.HAPPY: return <Smile className="w-3 h-3" />;
      case VoiceEmotion.SAD: return <span className="text-xs">😢</span>;
      case VoiceEmotion.ANGRY: return <span className="text-xs">😠</span>;
      case VoiceEmotion.EXCITED: return <span className="text-xs">🤩</span>;
      case VoiceEmotion.SERIOUS: return <span className="text-xs">👔</span>;
      default: return <Smile className="w-3 h-3 opacity-50" />;
    }
  };

  const getCharacterInfo = (char: VoiceCharacter) => {
    switch(char) {
      case VoiceCharacter.KORE: return { icon: <User className="w-3 h-3" />, label: 'Clear' };
      case VoiceCharacter.PUCK: return { icon: <Zap className="w-3 h-3" />, label: 'Energetic' };
      case VoiceCharacter.CHARON: return { icon: <User className="w-3 h-3" />, label: 'Deep' };
      case VoiceCharacter.FENRIR: return { icon: <Volume2 className="w-3 h-3" />, label: 'Strong' };
      case VoiceCharacter.ZEPHYR: return { icon: <Volume2 className="w-3 h-3" />, label: 'Soft' };
      case VoiceCharacter.AOEDE: return { icon: <Radio className="w-3 h-3" />, label: 'Melodic' };
      case VoiceCharacter.EOS: return { icon: <Smile className="w-3 h-3" />, label: 'Bright' };
      case VoiceCharacter.CHILD_GIRL: return { icon: <Smile className="w-3 h-3 text-pink-400" />, label: '8yo Girl' };
      case VoiceCharacter.CHILD_BOY: return { icon: <User className="w-3 h-3 text-blue-400" />, label: '8yo Boy' };
      default: return { icon: <User className="w-3 h-3" />, label: 'AI' };
    }
  };

  const getLanguageIcon = (lang: Language) => {
    switch(lang) {
      case Language.BANGLA: return '🇧🇩';
      case Language.HINDI: return '🇮🇳';
      case Language.ENGLISH: return '🌐';
      default: return '💬';
    }
  };

  const bgmTracksList: { id: BGMTrack; label: string; desc: string }[] = [
    { id: 'none', label: 'None', desc: 'Voice Only' },
    { id: 'acoustic', label: 'Soft Acoustic', desc: 'Piano & Nylon' },
    { id: 'lofi', label: 'Chill Lo-Fi', desc: 'Mellow Rhodes' },
    { id: 'cinematic', label: 'Cinematic', desc: 'Lush Atmospheric' },
    { id: 'zen', label: 'Peaceful Zen', desc: 'Meditation Bowls' },
    { id: 'custom', label: 'Custom Upload', desc: 'Your Audio File' },
  ];

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-500" /> Voice Engine
        </h3>
        {onResetToDefault && (
          <button
            type="button"
            onClick={onResetToDefault}
            disabled={isGenerating}
            title="Reset Voice Actor, Emotion, Tone, BGM, and Speed to default"
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition-all border border-slate-200 hover:border-indigo-200 shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
            <span>Reset to Default</span>
          </button>
        )}
      </div>

      {/* Language Selection */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Languages className="w-3 h-3" /> Target Language
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(Language).map((lang) => (
            <button
              key={lang}
              disabled={isGenerating}
              onClick={() => updateConfig('language', lang)}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border transition-all ${
                config.language === lang
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-xl mb-1">{getLanguageIcon(lang)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {lang === Language.BANGLA ? 'Bengali' : lang}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Music Overlay Section */}
      <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
            <Music className="w-3.5 h-3.5 text-emerald-600" /> Background Music Overlay
          </div>
          {currentBGMTrack !== 'none' && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>

        {/* BGM Track Selector Grid */}
        <div className="grid grid-cols-2 gap-2">
          {bgmTracksList.map((track) => (
            <div
              key={track.id}
              onClick={() => updateBGMConfig({ track: track.id })}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all text-left relative flex flex-col justify-between ${
                currentBGMTrack === track.id
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold leading-tight">{track.label}</div>
                <div className={`text-[9px] mt-0.5 ${currentBGMTrack === track.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {track.desc}
                </div>
              </div>

              {/* Preview Button (for tracks other than none) */}
              {track.id !== 'none' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewBGM(track.id);
                  }}
                  className={`mt-2 py-1 px-2 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                    currentBGMTrack === track.id
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                  title={previewingTrack === track.id ? 'Stop Audition' : 'Listen Preview'}
                >
                  {previewingTrack === track.id ? (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-current" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current" /> Preview
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Custom BGM File Upload */}
        {currentBGMTrack === 'custom' && (
          <div className="pt-2">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={customBgmInputRef}
              onChange={handleCustomBgmUpload}
            />
            <button
              onClick={() => customBgmInputRef.current?.click()}
              className="w-full py-2.5 px-3 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              {config.bgmConfig?.customFileName ? (
                <span className="truncate max-w-[200px]">{config.bgmConfig.customFileName}</span>
              ) : (
                'Choose Audio File (MP3 / WAV)'
              )}
            </button>
          </div>
        )}

        {/* BGM Volume Slider (only shown when a track is selected) */}
        {currentBGMTrack !== 'none' && (
          <div className="pt-2 space-y-1.5 border-t border-emerald-100">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1 text-emerald-800">
                <Sliders className="w-3 h-3" /> Music Volume
              </span>
              <span className="text-emerald-700 font-mono">
                {Math.round(currentBGMVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.45"
              step="0.01"
              value={currentBGMVolume}
              onChange={(e) => updateBGMConfig({ volume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-emerald-200/60 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="text-[9px] text-slate-400">
              Auto-ducked underneath speech for maximum clarity.
            </div>
          </div>
        )}
      </div>

      {/* Voice Cloning Section */}
      <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-3 relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
          Beta
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-[10px] uppercase tracking-wider">
            <Fingerprint className="w-3 h-3" /> Voice Cloning
          </div>
          <button 
            onClick={() => setShowCloningGuide(!showCloningGuide)}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
          >
            {showCloningGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Tips
          </button>
        </div>

        <AnimatePresence>
          {showCloningGuide && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/80 rounded-xl p-3 text-[10px] text-indigo-900 border border-indigo-100 space-y-2 overflow-hidden"
            >
              <div className="flex gap-2">
                <Info className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                <p><strong>Length:</strong> 10-30s of clear speech.</p>
              </div>
              <div className="flex gap-2">
                <Info className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                <p><strong>Environment:</strong> Silence is key.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {config.clonedVoiceData ? (
          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileAudio className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-slate-600 truncate">{config.clonedVoiceData.fileName}</span>
            </div>
            <button 
              onClick={removeClonedVoice}
              className="text-slate-300 hover:text-red-500 p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="w-full py-3 bg-white border border-indigo-200 rounded-xl text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-3 h-3" /> Upload Voice Sample
            </button>
          </div>
        )}
      </div>

      {!config.clonedVoiceData && (
        <>
          {/* Voice Character Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voice Library</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(VoiceCharacter).map((char) => {
                const info = getCharacterInfo(char);
                return (
                  <button
                    key={char}
                    disabled={isGenerating}
                    onClick={() => updateConfig('voiceCharacter', char)}
                    title={`${char} - ${info.label}`}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                      config.voiceCharacter === char
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300'
                    } disabled:opacity-50`}
                  >
                    <div className="mb-1">{info.icon}</div>
                    <span className="truncate w-full text-center">{char}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotion Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vocal Emotion</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(VoiceEmotion).map((emotion) => (
                <button
                  key={emotion}
                  disabled={isGenerating}
                  onClick={() => updateConfig('emotion', emotion)}
                  className={`flex items-center justify-center gap-2 py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                    config.emotion === emotion
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                  } disabled:opacity-50`}
                >
                  {getEmotionIcon(emotion)}
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tone Preset</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(VoiceTone).map((tone) => (
                <button
                  key={tone}
                  disabled={isGenerating}
                  onClick={() => updateConfig('tone', tone)}
                  className={`flex items-center gap-3 py-2.5 px-4 rounded-2xl text-sm font-medium border transition-all ${
                    config.tone === tone
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  } disabled:opacity-50`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    {tone === VoiceTone.PROFESSIONAL ? <Radio className="w-4 h-4" /> : tone === VoiceTone.SOFT ? <Volume2 className="w-4 h-4" /> : <Smile className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-xs">{tone}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {tone === VoiceTone.PROFESSIONAL ? 'News / Documentary' : tone === VoiceTone.SOFT ? 'Calm & soothing' : 'Conversational'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Speed Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Playback Speed</label>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {Object.values(SpeechSpeed).map((speed) => (
            <button
              key={speed}
              disabled={isGenerating}
              onClick={() => updateConfig('speed', speed)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                config.speed === speed
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              } disabled:opacity-50`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;


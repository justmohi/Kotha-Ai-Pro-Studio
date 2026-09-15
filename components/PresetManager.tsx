import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  BookmarkCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  Music, 
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { VoicePreset, TTSConfig, VoiceCharacter, VoiceEmotion, VoiceTone, SpeechSpeed, Language } from '../types';

interface PresetManagerProps {
  currentConfig: Omit<TTSConfig, 'text'>;
  presets: VoicePreset[];
  onSave: (name: string) => void;
  onLoad: (preset: VoicePreset) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  isGenerating: boolean;
}

const STARTER_PRESETS: VoicePreset[] = [
  {
    id: 'starter-documentary',
    name: 'Bengali Documentary',
    config: {
      language: Language.BANGLA,
      voiceCharacter: VoiceCharacter.KORE,
      tone: VoiceTone.PROFESSIONAL,
      emotion: VoiceEmotion.SERIOUS,
      speed: SpeechSpeed.NORMAL,
      bgmConfig: { track: 'cinematic', volume: 0.16 }
    }
  },
  {
    id: 'starter-storyteller',
    name: 'Soothing Storyteller',
    config: {
      language: Language.BANGLA,
      voiceCharacter: VoiceCharacter.AOEDE,
      tone: VoiceTone.SOFT,
      emotion: VoiceEmotion.NEUTRAL,
      speed: SpeechSpeed.SLOW,
      bgmConfig: { track: 'acoustic', volume: 0.18 }
    }
  },
  {
    id: 'starter-commercial',
    name: 'Energetic Promo',
    config: {
      language: Language.ENGLISH,
      voiceCharacter: VoiceCharacter.PUCK,
      tone: VoiceTone.NORMAL,
      emotion: VoiceEmotion.EXCITED,
      speed: SpeechSpeed.FAST,
      bgmConfig: { track: 'lofi', volume: 0.20 }
    }
  }
];

const PresetManager: React.FC<PresetManagerProps> = ({
  currentConfig,
  presets,
  onSave,
  onLoad,
  onDelete,
  onRename,
  isGenerating
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savedSuccessAlert, setSavedSuccessAlert] = useState(false);

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    onSave(newPresetName.trim());
    setNewPresetName('');
    setSavedSuccessAlert(true);
    setTimeout(() => setSavedSuccessAlert(false), 2500);
  };

  const handleStartRename = (preset: VoicePreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };

  const isPresetActive = (preset: VoicePreset) => {
    const p = preset.config;
    return (
      p.voiceCharacter === currentConfig.voiceCharacter &&
      p.emotion === currentConfig.emotion &&
      p.tone === currentConfig.tone &&
      p.speed === currentConfig.speed &&
      (p.bgmConfig?.track ?? 'none') === (currentConfig.bgmConfig?.track ?? 'none')
    );
  };

  const bgmTrackLabel = (track?: string) => {
    if (!track || track === 'none') return 'No BGM';
    if (track === 'acoustic') return 'Acoustic';
    if (track === 'lofi') return 'Chill Lo-Fi';
    if (track === 'cinematic') return 'Cinematic';
    if (track === 'zen') return 'Zen Peace';
    if (track === 'custom') return 'Custom Audio';
    return track;
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-600" />
          <span>My Presets</span>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
            {presets.length}
          </span>
        </h3>
        <span className="text-[11px] font-medium text-slate-400">
          Save & switch setups with 1-click
        </span>
      </div>

      {/* Snapshot of settings to be saved */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-indigo-700">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Current Voice Snapshot
          </span>
          <span className="text-[10px] font-normal lowercase tracking-normal text-slate-400">
            auto-captured for new presets
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs">
            Actor: {currentConfig.voiceCharacter}
          </span>
          <span className="bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs">
            Emotion: {currentConfig.emotion}
          </span>
          <span className="bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs">
            Tone: {currentConfig.tone}
          </span>
          <span className="bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs">
            Speed: {currentConfig.speed}
          </span>
          <span className="bg-white border border-slate-200 text-indigo-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
            <Music className="w-3 h-3 text-indigo-500" />
            BGM: {bgmTrackLabel(currentConfig.bgmConfig?.track)}
          </span>
        </div>
      </div>

      {/* Save Input Form */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder="Name your custom preset (e.g., YouTube Documentary)..."
            disabled={isGenerating}
            className="flex-grow px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder-slate-400 text-slate-800"
          />
          <button
            onClick={handleSave}
            disabled={isGenerating || !newPresetName.trim()}
            title="Save current voice settings as a preset"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 transition-all shadow-sm active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Save Preset</span>
          </button>
        </div>
        <AnimatePresence>
          {savedSuccessAlert && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 pl-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Custom preset saved to your library!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preset List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {presets.length === 0 ? (
          <div className="text-center py-5 px-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-500">No custom presets saved yet.</p>
            <p className="text-[11px] text-slate-400">
              Customize voice actor, emotion, tone, speed, and BGM above, then save them here!
            </p>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                Or Try A Quick Preset:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTER_PRESETS.map((starter) => (
                  <button
                    key={starter.id}
                    onClick={() => onLoad(starter)}
                    disabled={isGenerating}
                    className="text-[10px] font-bold bg-white text-indigo-700 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {starter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          presets.map((preset) => {
            const active = isPresetActive(preset);
            const isEditing = editingId === preset.id;

            return (
              <div
                key={preset.id}
                className={`group relative rounded-2xl border p-3 transition-all ${
                  active 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-grow min-w-0">
                    {/* Header Row / Rename Mode */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mb-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(preset.id, e as any);
                            if (e.key === 'Escape') handleCancelRename(e as any);
                          }}
                          autoFocus
                          className="px-2 py-1 text-xs font-bold border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                        />
                        <button
                          onClick={(e) => handleSaveRename(preset.id, e)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Save new name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {preset.name}
                        </span>
                        {active && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                            Active
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                        {preset.config.voiceCharacter}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                        {preset.config.emotion}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                        {preset.config.tone}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                        {preset.config.speed}
                      </span>
                      {preset.config.bgmConfig?.track && preset.config.bgmConfig.track !== 'none' && (
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Music className="w-2.5 h-2.5" />
                          {preset.config.bgmConfig.track}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons (1-click load, rename, delete) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onLoad(preset)}
                      disabled={isGenerating}
                      title="Load preset (1-click)"
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs ${
                        active
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                          : 'bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{active ? 'Applied' : 'Load'}</span>
                      {!active && <ArrowRight className="w-3 h-3" />}
                    </button>
                    {!isEditing && (
                      <button
                        onClick={(e) => handleStartRename(preset, e)}
                        disabled={isGenerating}
                        title="Edit preset name"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(preset.id)}
                      disabled={isGenerating}
                      title="Delete preset (1-click)"
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PresetManager;

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Trash2, 
  Sparkles, 
  HelpCircle, 
  PauseCircle, 
  Timer, 
  Info, 
  Clock, 
  Loader2, 
  Zap, 
  Volume2, 
  VolumeX, 
  Eye, 
  Edit3, 
  X, 
  Tag, 
  Mic2,
  Check,
  Crown,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Language, SpeechSpeed, VoiceCharacter, UserProfile } from '../types';

interface ScriptEditorProps {
  text: string;
  language: Language;
  speed: SpeechSpeed;
  isGenerating: boolean;
  onTextChange: (newText: string) => void;
  onGenerate: () => void;
  voiceCharacter: VoiceCharacter;
  isClonedVoice?: boolean;
  user?: UserProfile;
  onTriggerUpgrade?: (reason: 'credits_exhausted' | 'duration_exceeded', duration?: number) => void;
}

export type SpeechModifier = 'emphasize' | 'whisper' | 'loud';

export interface ScriptSegment {
  id: string;
  type: 'text' | 'modifier' | 'pause';
  text?: string;
  modifier?: SpeechModifier;
  content?: string;
  duration?: string;
  unit?: string;
  fullTag: string;
}

export const parseScriptMarkup = (str: string): ScriptSegment[] => {
  if (!str) return [];
  const tagRegex = /\[(emphasize|whisper|loud)\]([\s\S]*?)\[\/\1\]|\[(pause|বিরতি)\s*([\d\.\u09E6-\u09EF]+)\s*(s|ms|sec|seconds?|সেকেন্ড)?\]/gi;
  let lastIndex = 0;
  let match;
  const segments: ScriptSegment[] = [];
  let counter = 0;

  while ((match = tagRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        id: `seg-text-${counter++}`,
        type: 'text',
        text: str.slice(lastIndex, match.index),
        fullTag: ''
      });
    }

    if (match[1]) {
      segments.push({
        id: `seg-mod-${counter++}`,
        type: 'modifier',
        modifier: match[1].toLowerCase() as SpeechModifier,
        content: match[2],
        fullTag: match[0]
      });
    } else if (match[3]) {
      segments.push({
        id: `seg-pause-${counter++}`,
        type: 'pause',
        duration: match[4],
        unit: match[5] || 's',
        fullTag: match[0]
      });
    }
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < str.length) {
    segments.push({
      id: `seg-text-${counter++}`,
      type: 'text',
      text: str.slice(lastIndex),
      fullTag: ''
    });
  }

  return segments;
};

const ScriptEditor: React.FC<ScriptEditorProps> = ({
  text,
  language,
  speed,
  isGenerating,
  onTextChange,
  onGenerate,
  voiceCharacter,
  isClonedVoice,
  user,
  onTriggerUpgrade
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPauseHelp, setShowPauseHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'visual'>('edit');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; selectedText: string }>({
    start: 0,
    end: 0,
    selectedText: ''
  });
  const [modifierAppliedToast, setModifierAppliedToast] = useState<string | null>(null);

  // Update selection on user interaction
  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const sel = text.substring(start, end);
    setSelectionRange({ start, end, selectedText: sel });
  };

  // Apply speech modifier tag ([emphasize], [whisper], [loud])
  const applySpeechModifier = (mod: SpeechModifier) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end, selectedText } = selectionRange;
    const current = text;
    let newText = '';
    let newCursorPos = 0;

    if (selectedText.trim()) {
      // Wrap selected text
      const wrapped = `[${mod}]${selectedText}[/${mod}]`;
      newText = current.substring(0, start) + wrapped + current.substring(end);
      newCursorPos = start + wrapped.length;
    } else {
      // Insert placeholder tag with default text for quick editing
      const placeholder = mod === 'emphasize' ? 'emphasized words' : mod === 'whisper' ? 'whispered words' : 'loud words';
      const inserted = `[${mod}]${placeholder}[/${mod}]`;
      const prefix = start > 0 && current[start - 1] !== ' ' ? ' ' : '';
      const suffix = start < current.length && current[start] !== ' ' ? ' ' : '';
      newText = current.substring(0, start) + prefix + inserted + suffix + current.substring(end);
      newCursorPos = start + prefix.length + `[${mod}]`.length;
    }

    onTextChange(newText);
    showToast(`Applied [${mod}] voice effect!`);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (selectedText.trim()) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        } else {
          const placeholder = mod === 'emphasize' ? 'emphasized words' : mod === 'whisper' ? 'whispered words' : 'loud words';
          const selStart = newCursorPos;
          const selEnd = selStart + placeholder.length;
          textareaRef.current.setSelectionRange(selStart, selEnd);
        }
      }
    }, 40);
  };

  // Insert Pause Tag
  const handleInsertPause = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onTextChange(text + ' ' + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = text;
    const prefix = start > 0 && current[start - 1] !== ' ' ? ' ' : '';
    const suffix = ' ';
    const inserted = prefix + tag + suffix;
    const newText = current.substring(0, start) + inserted + current.substring(end);

    onTextChange(newText);
    showToast(`Added ${tag}`);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + inserted.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 40);
  };

  // Remove tag from visual view
  const handleRemoveTag = (segment: ScriptSegment) => {
    if (!segment.fullTag) return;
    let replacement = '';
    if (segment.type === 'modifier') {
      replacement = segment.content || '';
    } else if (segment.type === 'pause') {
      replacement = '';
    }

    const index = text.indexOf(segment.fullTag);
    if (index !== -1) {
      const newText = text.substring(0, index) + replacement + text.substring(index + segment.fullTag.length);
      onTextChange(newText);
      showToast(`Removed ${segment.type === 'modifier' ? `[${segment.modifier}]` : 'pause'} tag`);
    }
  };

  const showToast = (msg: string) => {
    setModifierAppliedToast(msg);
    setTimeout(() => setModifierAppliedToast(null), 2200);
  };

  // Statistics
  const calculateWordCount = (str: string): number => {
    if (!str.trim()) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const calculateReadingTime = (str: string, spd: SpeechSpeed): string => {
    const words = calculateWordCount(str);
    if (words === 0) return '0s';
    let wpm = 130;
    if (spd === SpeechSpeed.SLOW) wpm = 95;
    if (spd === SpeechSpeed.FAST) wpm = 175;
    const totalSeconds = Math.round((words / wpm) * 60);
    if (totalSeconds < 60) return `~${Math.max(1, totalSeconds)}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `~${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const calculateEstimatedDurationSeconds = (str: string, spd: SpeechSpeed): number => {
    if (!str.trim()) return 0;
    // Clean modifiers to get purely spoken text
    const cleanSpoken = str.replace(/\[(emphasize|whisper|loud)\]([\s\S]*?)\[\/\1\]/gi, '$2')
                           .replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, ' ');
    const words = cleanSpoken.trim().split(/\s+/).filter(Boolean).length;
    let wpm = 130;
    if (spd === SpeechSpeed.SLOW) wpm = 95;
    if (spd === SpeechSpeed.FAST) wpm = 175;
    let totalSec = (words / wpm) * 60;

    // Add pause durations
    const pauseRegex = /\[(?:pause|বিরতি)\s*([\d\.\u09E6-\u09EF]+)\s*(s|ms|sec|seconds?|সেকেন্ড)?\]/gi;
    let match;
    while ((match = pauseRegex.exec(str)) !== null) {
      const rawVal = match[1];
      const unit = (match[2] || 's').toLowerCase();
      const val = parseFloat(rawVal);
      if (!isNaN(val)) {
        if (unit.startsWith('m')) {
          totalSec += val / 1000;
        } else {
          totalSec += val;
        }
      }
    }
    return totalSec;
  };

  const wordCount = calculateWordCount(text);
  const estimatedReadingTime = calculateReadingTime(text, speed);
  const estimatedDurationSec = calculateEstimatedDurationSeconds(text, speed);

  // User Tier & Limits Assessment
  const isUnlimited = user?.monthlyLimit === -1;
  const creditsLeft = isUnlimited ? Infinity : Math.max(0, (user?.monthlyLimit ?? 10) - (user?.creditsUsed ?? 0));
  const isCreditsExhausted = !isUnlimited && creditsLeft <= 0;
  const maxAllowedDuration = user?.maxDurationSeconds ?? 30;
  const isDurationExceeded = text.trim().length > 0 && estimatedDurationSec > maxAllowedDuration;

  // Parse markup for visual view & effect count summary
  const segments = parseScriptMarkup(text);
  const emphasizeCount = segments.filter(s => s.type === 'modifier' && s.modifier === 'emphasize').length;
  const whisperCount = segments.filter(s => s.type === 'modifier' && s.modifier === 'whisper').length;
  const loudCount = segments.filter(s => s.type === 'modifier' && s.modifier === 'loud').length;
  const pauseCount = segments.filter(s => s.type === 'pause').length;
  const totalEffects = emphasizeCount + whisperCount + loudCount + pauseCount;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-100 p-4 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Script Editor
          </span>

          {/* View Mode Toggle: Edit vs Visual Tags */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                viewMode === 'edit'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                viewMode === 'visual'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Visual Tags</span>
              {totalEffects > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  viewMode === 'visual' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {totalEffects}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowPauseHelp(!showPauseHelp)}
            className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
            title="Speech modifier & pause guide"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Guide
          </button>
          <button 
            type="button"
            onClick={() => onTextChange('')}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Guide Help Banner */}
      <AnimatePresence>
        {showPauseHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-50/70 border-b border-indigo-100 p-4 text-xs text-indigo-950 space-y-2"
          >
            <p className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Speech Modifiers & Rhythm Guide
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Highlight any word or sentence in your script, then click a modifier button to apply studio voice styling:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> [emphasize]word[/emphasize]
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Stressed syllables, energetic punch, and dynamic inflection.</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-sky-200/80 shadow-2xs">
                <span className="font-bold text-sky-800 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-sky-500" /> [whisper]word[/whisper]
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Soft, intimate, breathy whisper delivery.</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 shadow-2xs">
                <span className="font-bold text-rose-800 flex items-center gap-1">
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" /> [loud]word[/loud]
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Heightened volume, bold resonance, and punchy projection.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech Modifiers & Highlights Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Voice Modifiers:
          </span>

          {/* Emphasize Button */}
          <button
            type="button"
            onClick={() => applySpeechModifier('emphasize')}
            title="Wrap highlighted text with [emphasize] tag"
            className="text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Emphasize</span>
          </button>

          {/* Whisper Button */}
          <button
            type="button"
            onClick={() => applySpeechModifier('whisper')}
            title="Wrap highlighted text with [whisper] tag"
            className="text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 hover:border-sky-300 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Whisper</span>
          </button>

          {/* Loud Button */}
          <button
            type="button"
            onClick={() => applySpeechModifier('loud')}
            title="Wrap highlighted text with [loud] tag"
            className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 hover:border-rose-300 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs active:scale-95"
          >
            <VolumeX className="w-3.5 h-3.5 text-rose-600" />
            <span>Loud</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Pause Buttons */}
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Timer className="w-3 h-3 text-indigo-500" /> Pauses:
          </span>
          <button
            type="button"
            onClick={() => handleInsertPause('[pause 0.5s]')}
            className="text-[11px] font-bold bg-white text-indigo-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            0.5s Pause
          </button>
          <button
            type="button"
            onClick={() => handleInsertPause('[pause 1s]')}
            className="text-[11px] font-bold bg-white text-indigo-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            1s Pause
          </button>
          <button
            type="button"
            onClick={() => handleInsertPause('[pause 2s]')}
            className="text-[11px] font-bold bg-white text-indigo-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            2s Pause
          </button>
        </div>

        {/* Selection / Notification feedback */}
        <div className="flex items-center gap-2">
          {selectionRange.selectedText.trim() ? (
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
              <span>{selectionRange.selectedText.length} chars highlighted</span>
            </span>
          ) : null}

          {modifierAppliedToast && (
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3" />
              {modifierAppliedToast}
            </span>
          )}
        </div>
      </div>

      {/* Warning banner: Credits Exhausted */}
      {isCreditsExhausted && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Free Generation Limit Reached ({user?.creditsUsed}/{user?.monthlyLimit} clips used).</strong> Upgrade to Basic, Plus, or Pro to continue generating studio voice clips.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTriggerUpgrade?.('credits_exhausted')}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Warning banner: Duration Cap Exceeded */}
      {isDurationExceeded && !isCreditsExhausted && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Duration Limit Exceeded (~{Math.round(estimatedDurationSec)}s estimated / {maxAllowedDuration < 60 ? `${maxAllowedDuration}s` : `${Math.round(maxAllowedDuration / 60)}m`} limit).</strong> The {user?.tier ? user.tier.toUpperCase() : 'FREE'} tier is capped at {maxAllowedDuration < 60 ? `${maxAllowedDuration}s` : `${Math.round(maxAllowedDuration / 60)}m`}. Trim script or upgrade your tier.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTriggerUpgrade?.('duration_exceeded', estimatedDurationSec)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Crown className="w-3.5 h-3.5 text-white" />
            Upgrade for Longer Scripts
          </button>
        </div>
      )}

      {/* Main Content: Edit Mode vs Visual Tags Mode */}
      {viewMode === 'edit' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full h-72 p-6 text-lg focus:outline-none resize-none text-slate-800 placeholder-slate-300"
            placeholder="Type or paste your script here... Select text to apply [emphasize], [whisper], or [loud] speech effects."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onSelect={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            disabled={isGenerating}
          />

          {/* Active Voice FX Summary bar at bottom of textarea */}
          {totalEffects > 0 && (
            <div className="px-6 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" /> Applied Voice Effects:
              </span>
              {emphasizeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className="bg-amber-100/80 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 hover:bg-amber-200 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-600" />
                  {emphasizeCount} Emphasized
                </button>
              )}
              {whisperCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className="bg-sky-100/80 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-200 hover:bg-sky-200 transition-colors flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3 text-sky-600" />
                  {whisperCount} Whisper
                </button>
              )}
              {loudCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className="bg-rose-100/80 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200 hover:bg-rose-200 transition-colors flex items-center gap-1"
                >
                  <VolumeX className="w-3 h-3 text-rose-600" />
                  {loudCount} Loud
                </button>
              )}
              {pauseCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className="bg-indigo-100/80 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                >
                  <Timer className="w-3 h-3 text-indigo-600" />
                  {pauseCount} Pauses
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className="ml-auto text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> View Visual Badges
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Visual Badge Tags Mode */
        <div className="p-6 min-h-[18rem] max-h-96 overflow-y-auto custom-scrollbar space-y-4 bg-slate-50/40">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Visual Speech Effects & Modifier Badges
            </span>
            <span className="text-[11px] text-slate-400">
              Click the <span className="font-bold text-red-500">×</span> on any badge to remove or unwrap effect
            </span>
          </div>

          {!text.trim() ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Script is empty. Switch to the Editor tab to write or paste text.
            </div>
          ) : (
            <div className="leading-relaxed text-base text-slate-800 bangla-font space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {segments.map((seg) => {
                  if (seg.type === 'text') {
                    return (
                      <span key={seg.id} className="whitespace-pre-wrap">
                        {seg.text}
                      </span>
                    );
                  }

                  if (seg.type === 'modifier' && seg.modifier === 'emphasize') {
                    return (
                      <span
                        key={seg.id}
                        className="inline-flex flex-col mx-1 my-1 p-1.5 rounded-xl bg-amber-50/90 border border-amber-300 shadow-2xs group relative transition-all hover:bg-amber-100/90"
                      >
                        <span className="inline-flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-amber-800 pb-0.5">
                          <span className="flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-amber-600" />
                            EMPHASIZE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(seg)}
                            title="Remove emphasize tag"
                            className="text-amber-500 hover:text-red-600 hover:bg-amber-200/70 rounded p-0.5 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                        <span className="font-bold text-amber-950 px-1 py-0.5 underline decoration-amber-400 decoration-2 underline-offset-4">
                          {seg.content}
                        </span>
                      </span>
                    );
                  }

                  if (seg.type === 'modifier' && seg.modifier === 'whisper') {
                    return (
                      <span
                        key={seg.id}
                        className="inline-flex flex-col mx-1 my-1 p-1.5 rounded-xl bg-sky-50/90 border border-sky-300 shadow-2xs group relative transition-all hover:bg-sky-100/90"
                      >
                        <span className="inline-flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-sky-800 pb-0.5">
                          <span className="flex items-center gap-0.5">
                            <Volume2 className="w-2.5 h-2.5 text-sky-600" />
                            WHISPER
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(seg)}
                            title="Remove whisper tag"
                            className="text-sky-500 hover:text-red-600 hover:bg-sky-200/70 rounded p-0.5 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                        <span className="italic text-sky-950 px-1 py-0.5 font-medium">
                          {seg.content}
                        </span>
                      </span>
                    );
                  }

                  if (seg.type === 'modifier' && seg.modifier === 'loud') {
                    return (
                      <span
                        key={seg.id}
                        className="inline-flex flex-col mx-1 my-1 p-1.5 rounded-xl bg-rose-50/90 border border-rose-300 shadow-2xs group relative transition-all hover:bg-rose-100/90"
                      >
                        <span className="inline-flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-rose-800 pb-0.5">
                          <span className="flex items-center gap-0.5">
                            <VolumeX className="w-2.5 h-2.5 text-rose-600" />
                            LOUD
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(seg)}
                            title="Remove loud tag"
                            className="text-rose-500 hover:text-red-600 hover:bg-rose-200/70 rounded p-0.5 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                        <span className="font-extrabold text-rose-950 px-1 py-0.5 uppercase tracking-wide">
                          {seg.content}
                        </span>
                      </span>
                    );
                  }

                  if (seg.type === 'pause') {
                    return (
                      <span
                        key={seg.id}
                        className="inline-flex items-center gap-1 mx-1 my-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold shadow-2xs group"
                      >
                        <Timer className="w-3 h-3 text-indigo-600" />
                        <span>{seg.duration}{seg.unit || 's'} Pause</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(seg)}
                          title="Remove pause tag"
                          className="text-indigo-400 hover:text-red-600 ml-1 rounded p-0.5 hover:bg-indigo-100 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar: Stats and Generate Button */}
      <div className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-100">
        {/* Live Character Count, Word Count & Estimated Reading Time */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-bold">
          <span className="flex items-center gap-1 text-slate-600">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            {text.length} chars
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-slate-600">
            {wordCount} words
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md" title="Estimated Reading Time based on selected speech speed">
            <Clock className="w-3 h-3" />
            {estimatedReadingTime} est. reading
          </span>
        </div>

        {isCreditsExhausted ? (
          <button
            onClick={() => onTriggerUpgrade?.('credits_exhausted')}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all transform active:scale-95 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            Limit Reached — Upgrade Plan
          </button>
        ) : isDurationExceeded ? (
          <button
            onClick={() => onTriggerUpgrade?.('duration_exceeded', estimatedDurationSec)}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all transform active:scale-95 w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200"
          >
            <Crown className="w-4 h-4 text-white" />
            Upgrade Plan (Over {maxAllowedDuration < 60 ? `${maxAllowedDuration}s` : `${Math.round(maxAllowedDuration / 60)}m`} Cap)
          </button>
        ) : (
          <button
            onClick={onGenerate}
            disabled={isGenerating || !text.trim()}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all transform active:scale-95 w-full sm:w-auto ${
              isGenerating 
                ? 'bg-indigo-400 cursor-not-allowed text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isClonedVoice ? 'Cloning & Mixing...' : 'Synthesizing Audio...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Convert to Voice
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScriptEditor;

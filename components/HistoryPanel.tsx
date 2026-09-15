import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  RotateCcw, 
  Music, 
  Search,
  Clock,
  Volume2,
  Sparkles,
  FileAudio
} from 'lucide-react';
import { HistoryItem, ExportFormat, TTSConfig, Language } from '../types';
import { audioBufferToMp3, audioBufferToWav } from './audioUtils';

interface HistoryPanelProps {
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  onLoadItem,
  onDeleteItem,
  onClearAll
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayToggle = (item: HistoryItem) => {
    if (playingId === item.id) {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      const audioUrl = URL.createObjectURL(item.audioBlob);
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().then(() => {
        setPlayingId(item.id);
      }).catch((err) => {
        console.error("Playback failed", err);
        setPlayingId(null);
      });
    }
  };

  const handleDownload = async (item: HistoryItem, format: ExportFormat) => {
    try {
      let downloadBlob = item.audioBlob;
      let ext = 'wav';

      if (format === 'mp3') {
        ext = 'mp3';
        // If stored blob is already mp3, download directly; otherwise convert via AudioContext
        if (item.audioBlob.type === 'audio/mp3') {
          downloadBlob = item.audioBlob;
        } else {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuf = await item.audioBlob.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          downloadBlob = audioBufferToMp3(audioBuf, 192);
          await ctx.close();
        }
      }

      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kotha-${item.voiceCharacter.toLowerCase()}-${item.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("History download failed:", e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const filteredItems = items.filter(item => 
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.voiceCharacter.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Generation History</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {items.length} saved clip{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-44 pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <button
              onClick={onClearAll}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1.5 transition-colors flex items-center gap-1"
              title="Clear all clips"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileAudio className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-500">No synthesized audio clips yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Write your script, choose voice & background music, and click "Convert to Voice" to generate your first take!
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No clips match your search query "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const isItemPlaying = playingId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-white transition-all space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Play button */}
                    <button
                      onClick={() => handlePlayToggle(item)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isItemPlaying 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                          : 'bg-white text-indigo-600 border border-slate-200 hover:border-indigo-400 shadow-sm'
                      }`}
                      title={isItemPlaying ? 'Pause' : 'Play clip'}
                    >
                      {isItemPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Content snippet */}
                    <div className="flex-grow min-w-0">
                      <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                        {item.text}
                      </p>
                      
                      {/* Metadata tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                          {item.language === Language.BANGLA || item.language === 'Bangla' ? 'Bengali' : item.language}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                          {item.voiceCharacter}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {item.duration ? `${item.duration.toFixed(1)}s` : 'Audio'}
                        </span>
                        {item.bgmTrack && item.bgmTrack !== 'none' && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Music className="w-2.5 h-2.5" /> {item.bgmTrack}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 ml-auto">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                    <button
                      onClick={() => onLoadItem(item)}
                      className="text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 transition-colors"
                      title="Load this text and settings into editor"
                    >
                      <RotateCcw className="w-3 h-3" /> Load in Editor
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(item, 'mp3')}
                        className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        title="Download as MP3"
                      >
                        <Download className="w-2.5 h-2.5" /> MP3
                      </button>
                      <button
                        onClick={() => handleDownload(item, 'wav')}
                        className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        title="Download as WAV"
                      >
                        <Download className="w-2.5 h-2.5" /> WAV
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                        title="Delete clip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;

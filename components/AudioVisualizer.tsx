import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileAudio
} from 'lucide-react';
import { ExportFormat } from '../types';
import { audioBufferToWav, audioBufferToMp3 } from './audioUtils';

interface AdvancedAudioPlayerProps {
  isPlaying: boolean;
  isGenerating: boolean;
  audioBuffer: AudioBuffer | null;
  analyserNode: AnalyserNode | null;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  voiceLabel?: string;
  subLabel?: string;
}

const AudioVisualizer: React.FC<AdvancedAudioPlayerProps> = ({
  isPlaying,
  isGenerating,
  audioBuffer,
  analyserNode,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onVolumeChange,
  voiceLabel = 'Preview Output',
  subLabel
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat>('mp3');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Real-time canvas waveform visualizer
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numBars = 48;
    const frequencyData = new Uint8Array(analyserNode ? analyserNode.frequencyBinCount : 64);
    // Dynamic simulated wave for idle or generating state
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.max(2, (width / numBars) - 2.5);
      const centerY = height / 2;

      if (isPlaying && analyserNode) {
        analyserNode.getByteFrequencyData(frequencyData);
      }

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;

        if (isPlaying && analyserNode) {
          // Map index to frequency range (emphasis on voice range: 100Hz - 4kHz)
          const freqIndex = Math.min(
            frequencyData.length - 1,
            Math.floor(Math.pow(i / numBars, 1.3) * (frequencyData.length * 0.6))
          );
          const rawValue = frequencyData[freqIndex] || 0;
          const normalized = rawValue / 255;
          // Symmetrical dynamic height
          barHeight = Math.max(4, normalized * (height * 0.88));
        } else if (isGenerating) {
          // Gentle pulsing travelling wave when synthesizing
          const wave = Math.sin(phase + i * 0.28) * 0.5 + 0.5;
          barHeight = Math.max(4, wave * (height * 0.65));
        } else {
          // Subtle idle static wave
          const baseHeight = audioBuffer ? 6 : 3;
          barHeight = baseHeight;
        }

        const x = i * (barWidth + 2.5) + (width - numBars * (barWidth + 2.5)) / 2;
        const yTop = centerY - barHeight / 2;

        // Gradient coloring
        const gradient = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
        if (isGenerating) {
          gradient.addColorStop(0, '#f59e0b');
          gradient.addColorStop(1, '#fbbf24');
        } else if (isPlaying) {
          // Playback head highlight
          const progressRatio = duration > 0 ? currentTime / duration : 0;
          const barRatio = i / numBars;
          if (barRatio <= progressRatio) {
            gradient.addColorStop(0, '#6366f1'); // Indigo 500
            gradient.addColorStop(0.5, '#8b5cf6'); // Violet 500
            gradient.addColorStop(1, '#a855f7'); // Purple 500
          } else {
            gradient.addColorStop(0, '#cbd5e1');
            gradient.addColorStop(1, '#94a3b8');
          }
        } else {
          gradient.addColorStop(0, '#94a3b8');
          gradient.addColorStop(1, '#cbd5e1');
        }

        ctx.fillStyle = gradient;
        // Rounded bar
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, barHeight / 2);
        ctx.roundRect(x, yTop, barWidth, barHeight, radius);
        ctx.fill();
      }

      phase += 0.08;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isGenerating, analyserNode, currentTime, duration, audioBuffer]);

  // Handle Scrubbing
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const seekTime = (clickX / rect.width) * duration;
    onSeek(seekTime);
  };

  const handleVolumeToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(volume);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const handleVolumeSlide = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
    onVolumeChange(newVol);
  };

  const handleDownload = async (format: ExportFormat) => {
    if (!audioBuffer) return;
    setIsExporting(true);
    try {
      let blob: Blob;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (format === 'mp3') {
        blob = audioBufferToMp3(audioBuffer, 192);
        filename = `kotha-voice-${timestamp}.mp3`;
      } else {
        blob = audioBufferToWav(audioBuffer);
        filename = `kotha-voice-${timestamp}.wav`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
      {/* Top Info Bar & Export Dropdown */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                Synthesizing audio...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {voiceLabel}
              </>
            )}
          </h4>
          {subLabel && (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {subLabel}
            </p>
          )}
        </div>

        {audioBuffer && !isGenerating && (
          <div className="flex items-center gap-2">
            {/* Format Selector Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDownloadFormat('mp3')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  downloadFormat === 'mp3'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                MP3
              </button>
              <button
                onClick={() => setDownloadFormat('wav')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  downloadFormat === 'wav'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                WAV
              </button>
            </div>

            <button
              onClick={() => handleDownload(downloadFormat)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95 rounded-xl text-xs font-bold transition-all"
              title={`Download in ${downloadFormat.toUpperCase()} format`}
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export {downloadFormat.toUpperCase()}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Waveform Visualizer */}
      <div className="relative w-full h-20 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          className="w-full h-full object-contain"
        />

        {/* Live Audio Tag badge */}
        <div className="absolute top-2 right-3 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            isPlaying ? 'bg-emerald-400 animate-ping' : isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
          }`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {isPlaying ? 'Playing Real-time FFT' : isGenerating ? 'Rendering' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Interactive Waveform Scrubber & Progress Bar */}
      <div className="space-y-1.5">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative w-full h-2.5 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors group overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Time stamps */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 font-bold px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            disabled={!audioBuffer || isGenerating}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all shadow-md transform active:scale-95 ${
              isPlaying
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
            } disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onSeek(0)}
            disabled={!audioBuffer || isGenerating}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <button
            onClick={handleVolumeToggle}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-600" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeSlide(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
          <span className="text-[10px] font-bold text-slate-400 w-7 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;

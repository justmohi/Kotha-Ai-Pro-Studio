import { TTSConfig, SpeechSpeed, VoiceTone, VoiceEmotion, VoiceCharacter } from "../types";
import { 
  decodeBase64, 
  decodePCMToAudioBuffer, 
  createSilenceBuffer, 
  concatenateAudioBuffers, 
  mixAudioBuffers 
} from "../components/audioUtils";
import { getBGMBuffer } from "./bgmGenerator";

interface ScriptSegment {
  type: 'text' | 'pause';
  text?: string;
  duration?: number; // seconds
}

/**
 * Parses script text into speech segments and pause durations.
 * Supports tags like [pause 1s], [pause 0.5s], [pause 2000ms]
 */
function parseScriptSegments(rawText: string): ScriptSegment[] {
  const pauseRegex = /\[(?:pause|বিরতি)\s*([\d\.\u09E6-\u09EF]+)\s*(s|ms|sec|seconds?|সেকেন্ড)?\]/gi;
  const segments: ScriptSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pauseRegex.exec(rawText)) !== null) {
    const textBefore = rawText.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push({ type: 'text', text: textBefore.trim() });
    }

    // Convert Bangla digits to English digits
    const banglaToEnglishMap: Record<string, string> = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    const numStr = match[1].replace(/[\u09E6-\u09EF]/g, (d) => banglaToEnglishMap[d] || d);
    const val = parseFloat(numStr) || 1.0;
    const unit = (match[2] || 's').toLowerCase();

    let durationSec = val;
    if (unit === 'ms') {
      durationSec = val / 1000;
    }
    // Constrain pause to sensible limits (0.1s to 10s)
    durationSec = Math.max(0.1, Math.min(10.0, durationSec));

    segments.push({ type: 'pause', duration: durationSec });
    lastIndex = pauseRegex.lastIndex;
  }

  const remaining = rawText.substring(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'text', text: remaining.trim() });
  }

  return segments;
}

/**
 * Calls the server-side /api/tts endpoint to synthesize audio securely
 */
async function requestTTSFromAPI(
  text: string,
  config: TTSConfig
): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language: config.language,
      tone: config.tone,
      emotion: config.emotion,
      speed: config.speed,
      voiceCharacter: config.voiceCharacter,
      clonedVoiceData: config.clonedVoiceData,
    }),
  });

  if (!response.ok) {
    let errMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const result = await response.json();
  if (!result.audioData) {
    throw new Error('No audio data received from server.');
  }
  return result.audioData;
}

/**
 * Synthesizes a single chunk of text via server API and converts to Web Audio AudioBuffer
 */
async function synthesizeTextChunk(
  text: string,
  config: TTSConfig,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const base64Audio = await requestTTSFromAPI(text, config);
  const binaryData = decodeBase64(base64Audio);
  return await decodePCMToAudioBuffer(binaryData, audioContext);
}

export async function generateSpeech(config: TTSConfig, audioContext: AudioContext): Promise<AudioBuffer> {
  const isCloning = !!config.clonedVoiceData;
  let voiceBuffer: AudioBuffer;

  if (isCloning && config.clonedVoiceData) {
    // Voice Cloning Path
    const cleanText = config.text.replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, ' ');
    try {
      const base64Audio = await requestTTSFromAPI(cleanText, config);
      const binaryData = decodeBase64(base64Audio);
      voiceBuffer = await decodePCMToAudioBuffer(binaryData, audioContext);
    } catch (error: any) {
      console.error("Cloning Error:", error);
      throw new Error(error.message || "An error occurred during voice cloning.");
    }
  } else {
    // Standard TTS Path: Check for pause tags
    const segments = parseScriptSegments(config.text);
    const hasPauses = segments.some(s => s.type === 'pause');

    if (!hasPauses || segments.length <= 1) {
      // Direct single synthesis (strip any residual tags if only text)
      const cleanText = config.text.replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, '').trim();
      voiceBuffer = await synthesizeTextChunk(cleanText || config.text, config, audioContext);
    } else {
      // Multi-segment with pause stitching
      try {
        const audioBuffers: AudioBuffer[] = [];

        for (const segment of segments) {
          if (segment.type === 'pause') {
            const pauseBuf = createSilenceBuffer(segment.duration || 1.0, audioContext, audioContext.sampleRate);
            audioBuffers.push(pauseBuf);
          } else if (segment.type === 'text' && segment.text) {
            const textBuf = await synthesizeTextChunk(segment.text, config, audioContext);
            audioBuffers.push(textBuf);
          }
        }

        voiceBuffer = concatenateAudioBuffers(audioBuffers, audioContext);
      } catch (error: any) {
        console.error("TTS Segment Error:", error);
        throw new Error(error.message || "An error occurred during multi-segment voice synthesis.");
      }
    }
  }

  // Check if Background Music Overlay is enabled
  if (config.bgmConfig && config.bgmConfig.track !== 'none') {
    try {
      let bgmBuffer: AudioBuffer | null = null;

      if (config.bgmConfig.track === 'custom' && config.bgmConfig.customAudioBuffer) {
        bgmBuffer = config.bgmConfig.customAudioBuffer;
      } else {
        bgmBuffer = await getBGMBuffer(
          config.bgmConfig.track,
          voiceBuffer.duration + 2,
          audioContext.sampleRate
        );
      }

      if (bgmBuffer) {
        const volume = config.bgmConfig.volume ?? 0.18;
        return mixAudioBuffers(voiceBuffer, bgmBuffer, volume, audioContext);
      }
    } catch (bgmError) {
      console.warn("BGM mixing failed, returning voice audio:", bgmError);
    }
  }

  return voiceBuffer;
}

import { GoogleGenAI, Modality } from "@google/genai";
import { TTSConfig, SpeechSpeed, VoiceTone, VoiceEmotion, VoiceCharacter } from "../types";
import { 
  decodeBase64, 
  decodePCMToAudioBuffer, 
  createSilenceBuffer, 
  concatenateAudioBuffers, 
  mixAudioBuffers 
} from "../components/audioUtils";
import { getBGMBuffer } from "./bgmGenerator";

// WARNING: Pure client-side Gemini SDK implementation using VITE_GEMINI_API_KEY / VITE_FIREBASE_API_KEY
// requested by user to support static web hosting environments (e.g., Netlify) without an Express backend.

interface ScriptSegment {
  type: 'text' | 'pause';
  text?: string;
  duration?: number; // seconds
}

/**
 * Retrieves the client-side Gemini API key for static/browser execution.
 * Prioritizes VITE_GEMINI_API_KEY, falls back to VITE_FIREBASE_API_KEY.
 */
export function getClientGeminiApiKey(): string {
  const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const key = (
    env?.VITE_GEMINI_API_KEY ||
    env?.VITE_FIREBASE_API_KEY ||
    ''
  ).trim();
  return key;
}

/**
 * Checks whether the current runtime is a static web hosting environment
 * (like Netlify, Vercel, GitHub Pages) or whether client-side generation is forced.
 */
export function isStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
  
  return (
    hostname.includes('netlify.app') ||
    hostname.includes('vercel.app') ||
    hostname.includes('github.io') ||
    hostname.includes('pages.dev') ||
    hostname.includes('surge.sh') ||
    hostname.includes('firebaseapp.com') ||
    hostname.includes('web.app')
  );
}

/**
 * Builds the customized prompt and voice character parameters for Gemini TTS.
 */
function buildTTSPrompt(
  text: string,
  config: TTSConfig
): { prompt: string; voiceName: string } {
  const {
    language = 'Bangla',
    tone = 'Professional',
    emotion = 'Neutral',
    speed = 'Normal',
    voiceCharacter = 'Kore',
  } = config;

  const speedInstruction =
    speed === 'Slow' ? 'slowly and clearly' : speed === 'Fast' ? 'rapidly but clearly' : 'at a natural pace';

  const toneInstruction =
    tone === 'Professional'
      ? 'as a professional news anchor or documentary narrator. Use a confident, clear, and neutral tone. No robotic artifacts.'
      : tone === 'Soft'
      ? 'in a soft, calm, and soothing voice with emotional warmth.'
      : 'in a normal, engaging conversational tone.';

  const emotionInstruction =
    emotion !== 'Neutral'
      ? `The speaker should sound ${String(emotion).toLowerCase()} throughout the speech.`
      : 'The speaker should use a natural, neutral emotional tone.';

  const langStr = String(language || 'Bangla');
  const languageContext =
    langStr === 'Bangla' || langStr === 'Bengali'
      ? 'Standard Neutral Bengali accent'
      : langStr === 'Hindi'
      ? 'Standard Hindi accent'
      : 'Neutral English accent';

  const charStr = String(voiceCharacter || 'Kore');
  let voiceName = charStr;
  let personaInstruction = '';

  if (charStr === 'Child Girl' || charStr === 'Child (Girl)') {
    voiceName = 'Puck';
    personaInstruction = 'ACT AS AN 8-YEAR-OLD GIRL. Use a high-pitched, sweet, and innocent voice. Speak like a child.';
  } else if (charStr === 'Child Boy' || charStr === 'Child (Boy)') {
    voiceName = 'Kore';
    personaInstruction = 'ACT AS AN 8-YEAR-OLD BOY. Use a youthful, energetic, and slightly high-pitched boyish voice. Speak like a child.';
  }

  const prompt = `Convert the following text into ${language} speech. 
${personaInstruction}
Tone Instruction: Read this ${toneInstruction} ${speedInstruction}. 
Emotion Instruction: ${emotionInstruction}
Accent: ${languageContext}.

Speech Modifiers Guidance:
- When words are enclosed in [emphasize]...[/emphasize], stress and pronounce those words with strong vocal emphasis, prominent pitch inflection, and dynamic punch.
- When words are enclosed in [whisper]...[/whisper], deliver those words in a soft, hushed, intimate whisper voice.
- When words are enclosed in [loud]...[/loud], speak those words with projected volume, bold resonance, and heightened power.
CRITICAL: Never read aloud the tag names or brackets ("[emphasize]", "[/emphasize]", "[whisper]", "[/whisper]", "[loud]", "[/loud]"). Apply the vocal delivery directly to the words enclosed within them.

Text: "${text}"`;

  return { prompt, voiceName };
}

/**
 * Performs direct client-side speech synthesis using @google/genai SDK in the browser.
 * Bypasses backend Express server for Netlify and static deployments.
 */
export async function generateVoiceDirectlyWithGemini(
  text: string,
  config: TTSConfig,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API Key: Voice generation requires an API key in static environments like Netlify. Please set VITE_GEMINI_API_KEY (or VITE_FIREBASE_API_KEY) in your environment variables and redeploy."
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Voice Cloning Path
    if (config.clonedVoiceData && config.clonedVoiceData.data) {
      const cleanText = (text || '').replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, ' ').trim();
      const prompt = `Listen carefully to the voice in the attached audio sample. 
Act as a professional voice cloning engine. 
Read the following text in EXACTLY the same voice, accent, tone, and vocal characteristics as the speaker in the sample. 
Emotion/Mood to convey: ${config.emotion || 'Neutral'}.
Maintain the emotional depth and pacing of the original speaker while injecting the requested emotion.
Language: ${config.language || 'Bangla'}
Text to read: "${cleanText}"`;

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    data: config.clonedVoiceData.data,
                    mimeType: config.clonedVoiceData.mimeType || 'audio/wav',
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.AUDIO],
          },
        });
      } catch (cloneErr: any) {
        console.warn('Native audio model failed, retrying with gemini-3.8-live fallback...', cloneErr?.message || cloneErr);
        response = await ai.models.generateContent({
          model: 'gemini-3.8-live',
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    data: config.clonedVoiceData.data,
                    mimeType: config.clonedVoiceData.mimeType || 'audio/wav',
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.AUDIO],
          },
        });
      }

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data ||
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error('No audio data received from Gemini voice cloning.');
      }
      return base64Audio;
    }

    // Standard TTS Path
    const { prompt, voiceName } = buildTTSPrompt(text, config);

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
    } catch (ttsErr: any) {
      console.warn('Primary TTS model failed, attempting gemini-3.1-flash-tts-preview fallback...', ttsErr?.message || ttsErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
    }

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
      response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('Failed to receive audio data from Gemini AI.');
    }

    return base64Audio;
  } catch (sdkError: any) {
    console.error('Client-side Gemini TTS error:', sdkError);
    const msg = String(sdkError?.message || sdkError || '');
    
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('403')) {
      throw new Error(
        'Invalid Gemini API Key: Please verify that VITE_GEMINI_API_KEY (or VITE_FIREBASE_API_KEY) is valid and has the Generative Language API enabled in Google AI Studio / Google Cloud Console.'
      );
    }
    if (msg.includes('QUOTA_EXCEEDED') || msg.includes('Resource has been exhausted') || msg.includes('429')) {
      throw new Error(
        'Gemini API Quota Exceeded: The current API key quota limit was reached. Please check your Gemini account or try again in a few moments.'
      );
    }
    throw new Error(sdkError.message || 'Client-side speech synthesis failed with Gemini.');
  }
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
 * Synthesizes voice audio either via pure client-side Gemini SDK or fallback backend.
 * Directly bypasses the Express backend when running on Netlify or when client key is provided.
 */
async function synthesizeVoiceAudio(
  text: string,
  config: TTSConfig
): Promise<string> {
  const clientKey = getClientGeminiApiKey();
  const staticEnv = isStaticHosting();

  // 1. If running on Netlify or other static hosts, or if a client API key is explicitly configured:
  // Completely bypass the Express server route /api/generate-voice or /api/tts.
  if (staticEnv || clientKey) {
    if (!clientKey) {
      throw new Error(
        "Missing Gemini API Key: Voice generation runs client-side on static hosting (Netlify). Please set VITE_GEMINI_API_KEY in your Netlify site settings (Site configuration → Environment variables) and redeploy."
      );
    }
    return await generateVoiceDirectlyWithGemini(text, config, clientKey);
  }

  // 2. Otherwise (local dev or full-stack container), call the server endpoint
  try {
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
      // If server returned 404 (e.g. Netlify static deploy without an Express server):
      if (response.status === 404) {
        if (clientKey) {
          console.warn("Server returned 404 (static host detected). Falling back to pure client-side Gemini SDK...");
          return await generateVoiceDirectlyWithGemini(text, config, clientKey);
        }
        throw new Error(
          "Server Error (404): No backend server found. On static hosting like Netlify, configure VITE_GEMINI_API_KEY in your environment variables to enable pure client-side voice generation."
        );
      }

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
  } catch (networkErr: any) {
    // If fetch failed completely (e.g. offline or static server), try client-side if key exists
    if (clientKey) {
      console.warn("Server route unreachable, switching to client-side Gemini SDK:", networkErr?.message);
      return await generateVoiceDirectlyWithGemini(text, config, clientKey);
    }
    throw networkErr;
  }
}

/**
 * Synthesizes a single chunk of text and converts to Web Audio AudioBuffer
 */
async function synthesizeTextChunk(
  text: string,
  config: TTSConfig,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const base64Audio = await synthesizeVoiceAudio(text, config);
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
      const base64Audio = await synthesizeVoiceAudio(cleanText, config);
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

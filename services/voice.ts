// WARNING: Pure client-side Gemini SDK implementation using VITE_GEMINI_API_KEY / VITE_FIREBASE_API_KEY
// requested by user to support static web hosting environments (e.g., Netlify) without an Express backend.

export {
  generateSpeech,
  generateVoiceDirectlyWithGemini,
  getClientGeminiApiKey,
  isStaticHosting
} from './geminiTTS';

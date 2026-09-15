import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const TIER_PRICING: Record<string, { name: string; amountCents: number; currency: string; bdtAmount: number }> = {
  basic: { name: 'Kotha Basic Plan', amountCents: 299, currency: 'usd', bdtAmount: 350 },
  plus: { name: 'Kotha Plus Plan', amountCents: 999, currency: 'usd', bdtAmount: 1190 },
  pro: { name: 'Kotha Pro Studio Plan', amountCents: 1999, currency: 'usd', bdtAmount: 2390 },
};

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON payloads (audio base64 can be large)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // TTS Generation Endpoint
  app.post('/api/tts', async (req, res) => {
    try {
      const {
        text,
        language = 'Bangla',
        tone = 'Professional',
        emotion = 'Neutral',
        speed = 'Normal',
        voiceCharacter = 'Kore',
        clonedVoiceData,
      } = req.body;

      if (!text && !clonedVoiceData) {
        return res.status(400).json({ error: 'Text or cloned voice data is required.' });
      }

      const ai = getAI();

      // Voice Cloning Path
      if (clonedVoiceData && clonedVoiceData.data) {
        const cleanText = (text || '').replace(/\[(?:pause|বিরতি)[^\]]*\]/gi, ' ').trim();
        const prompt = `Listen carefully to the voice in the attached audio sample. 
Act as a professional voice cloning engine. 
Read the following text in EXACTLY the same voice, accent, tone, and vocal characteristics as the speaker in the sample. 
Emotion/Mood to convey: ${emotion}.
Maintain the emotional depth and pacing of the original speaker while injecting the requested emotion.
Language: ${language}
Text to read: "${cleanText}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    data: clonedVoiceData.data,
                    mimeType: clonedVoiceData.mimeType || 'audio/wav',
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

        const base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
        if (!base64Audio) {
          return res.status(500).json({ error: 'Failed to generate cloned voice audio from Gemini.' });
        }

        return res.json({ audioData: base64Audio });
      }

      // Standard TTS Path
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

      const languageContext =
        language === 'Bangla' || language === 'Bengali'
          ? 'Standard Neutral Bengali accent'
          : language === 'Hindi'
          ? 'Standard Hindi accent'
          : 'Neutral English accent';

      let voiceName = voiceCharacter;
      let personaInstruction = '';

      if (voiceCharacter === 'Child (Girl)') {
        voiceName = 'Puck';
        personaInstruction = 'ACT AS AN 8-YEAR-OLD GIRL. Use a high-pitched, sweet, and innocent voice. Speak like a child.';
      } else if (voiceCharacter === 'Child (Boy)') {
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
        console.warn('Primary TTS model failed, attempting gemini-3.1-flash-tts-preview...', ttsErr?.message || ttsErr);
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

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: 'Failed to receive audio data from Gemini AI.' });
      }

      return res.json({ audioData: base64Audio });
    } catch (err: any) {
      console.error('TTS endpoint error:', err);
      return res.status(500).json({ error: err.message || 'Speech synthesis failed' });
    }
  });

  // Create Checkout Session (Stripe & SSLCommerz)
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { tier, userId, userEmail, provider = 'stripe' } = req.body;
      const plan = TIER_PRICING[tier];
      if (!plan) {
        return res.status(400).json({ error: `Invalid subscription tier: ${tier}` });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const origin = `${protocol}://${host}`;

      if (provider === 'stripe') {
        const stripe = getStripe();
        if (stripe) {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: plan.currency,
                  product_data: {
                    name: plan.name,
                    description: `Monthly subscription for Kotha AI Voice Studio (${tier.toUpperCase()} tier).`,
                  },
                  unit_amount: plan.amountCents,
                  recurring: {
                    interval: 'month',
                  },
                },
                quantity: 1,
              },
            ],
            mode: 'subscription',
            customer_email: userEmail || undefined,
            client_reference_id: userId || undefined,
            metadata: {
              userId: userId || 'anonymous',
              tier,
            },
            success_url: `${origin}/?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?payment=cancel&tier=${tier}`,
          });

          return res.json({ checkoutUrl: session.url, provider: 'stripe', sessionId: session.id });
        } else {
          // Stripe Sandbox mode simulation when keys are in development
          return res.json({
            checkoutUrl: `${origin}/?payment=success&tier=${tier}&simulated=true`,
            provider: 'stripe_sandbox',
            isSimulated: true,
            message: 'Stripe Sandbox mode active (Provide STRIPE_SECRET_KEY in Settings to enable Live Stripe Checkout)'
          });
        }
      }

      // SSLCommerz Payment Gateway
      if (provider === 'sslcommerz') {
        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';

        if (storeId && storePass) {
          const tranId = `SSLC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const sslUrl = isSandbox
            ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

          const params = new URLSearchParams({
            store_id: storeId,
            store_passwd: storePass,
            total_amount: plan.bdtAmount.toString(),
            currency: 'BDT',
            tran_id: tranId,
            success_url: `${origin}/api/sslcommerz/success`,
            fail_url: `${origin}/api/sslcommerz/fail`,
            cancel_url: `${origin}/api/sslcommerz/cancel`,
            ipn_url: `${origin}/api/sslcommerz/ipn`,
            cus_name: 'Studio Creator',
            cus_email: userEmail || 'creator@kotha.ai',
            cus_add1: 'Dhaka',
            cus_city: 'Dhaka',
            cus_country: 'Bangladesh',
            cus_phone: '01700000000',
            shipping_method: 'NO',
            product_name: plan.name,
            product_category: 'Digital Voice Service',
            product_profile: 'non-physical-goods',
            value_a: userId || '',
            value_b: tier,
          });

          const sslRes = await fetch(sslUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          const sslData = await sslRes.json();

          if (sslData.status === 'SUCCESS' && sslData.GatewayPageURL) {
            return res.json({ checkoutUrl: sslData.GatewayPageURL, provider: 'sslcommerz', tranId });
          }
        }

        // Fallback for SSLCommerz Sandbox
        return res.json({
          checkoutUrl: `${origin}/?payment=success&tier=${tier}&provider=sslcommerz&simulated=true`,
          provider: 'sslcommerz_sandbox',
          isSimulated: true,
          message: 'SSLCommerz Sandbox active (Provide SSLCOMMERZ_STORE_ID in Settings to enable Live SSLCommerz)'
        });
      }

      return res.status(400).json({ error: 'Unsupported payment provider' });
    } catch (err: any) {
      console.error('Checkout session error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create checkout session' });
    }
  });

  // SSLCommerz Callback Handlers
  app.post('/api/sslcommerz/success', (req, res) => {
    const { tran_id, value_b } = req.body;
    const tier = value_b || 'basic';
    res.redirect(`/?payment=success&tier=${tier}&tran_id=${tran_id || ''}&provider=sslcommerz`);
  });

  app.post('/api/sslcommerz/fail', (_req, res) => {
    res.redirect('/?payment=failed&provider=sslcommerz');
  });

  app.post('/api/sslcommerz/cancel', (_req, res) => {
    res.redirect('/?payment=cancel&provider=sslcommerz');
  });

  app.post('/api/sslcommerz/ipn', (req, res) => {
    console.log('SSLCommerz IPN Notification received:', req.body);
    res.status(200).send('IPN Received');
  });

  // Stripe Webhook Handler
  app.post('/api/webhook/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();

    let event: any = req.body;

    if (stripe && webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } catch (err: any) {
        console.error('Stripe webhook verification error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      console.log(`Stripe subscription upgraded for user ${metadata.userId} to tier ${metadata.tier}`);
    }

    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

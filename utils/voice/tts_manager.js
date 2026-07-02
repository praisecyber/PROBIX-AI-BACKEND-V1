/**
 * TTS Manager — Multilanguage v3
 *
 * Converts text to speech with language-aware voice/engine routing.
 *
 * Primary:  Edge TTS (free, uses Microsoft's Edge TTS service, no API key, 400+ voices)
 * Secondary: Kokoro (local, free, fast) — supports: en, fr, es, it, pt, ja, zh, ko
 * Fallback: ElevenLabs (cloud) — eleven_multilingual_v2 (29 languages)
 *
 * Language → Edge TTS default voice mapping
 */

'use strict';

const axios = require('axios');
const { EdgeTTS } = require('edge-tts-universal');

const KOKORO_URL        = process.env.KOKORO_URL        || 'http://localhost:8880';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

// ─────────────────────────────────────────────────────────────────────────────
// Language routing maps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default Edge TTS voice per language.
 * If none specified in the request, this voice is used.
 */
const EDGE_TTS_DEFAULT_VOICE = {
  en: 'en-US-AriaNeural',
  'en-gb': 'en-GB-SoniaNeural',
  fr: 'fr-FR-DeniseNeural',
  es: 'es-ES-ElviraNeural',
  it: 'it-IT-ElsaNeural',
  pt: 'pt-PT-FernandaNeural',
  ja: 'ja-JP-NanamiNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  ko: 'ko-KR-SunHiNeural',
  ar: 'ar-SA-HamedNeural',
  hi: 'hi-IN-SwaraNeural',
  ru: 'ru-RU-SvetlanaNeural',
  nl: 'nl-NL-ColetteNeural',
  tr: 'tr-TR-EmelNeural',
  pl: 'pl-PL-AgnieszkaNeural',
  sv: 'sv-SE-SofieNeural',
};

/**
 * Languages fully supported by Kokoro with their internal codes.
 */
const KOKORO_LANG_MAP = {
  en:  'a',   // American English
  'en-gb': 'b', // British English
  fr:  'f',   // French
  es:  'e',   // Spanish
  it:  'i',   // Italian
  pt:  'p',   // Portuguese
  ja:  'j',   // Japanese
  zh:  'z',   // Chinese (Mandarin)
};

/**
 * Default Kokoro voice per language.
 */
const KOKORO_DEFAULT_VOICE = {
  en:  'af_bella',
  'en-gb': 'af_bella',
  fr:  'ff_siwis',
  es:  'es_dani',
  it:  'it_nicola',
  pt:  'pt_dinis',
  ja:  'jf_alpha',
  zh:  'zf_xiaobei',
};

/**
 * Languages where ElevenLabs is preferred
 */
const ELEVENLABS_PREFERRED_LANGS = new Set(['ko', 'ar', 'hi', 'ru', 'nl', 'tr', 'pl', 'sv']);

// ─────────────────────────────────────────────────────────────────────────────
// Language routing helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decide which TTS engine to use and what params to send.
 * @param {string} language — BCP-47 / Whisper language code (e.g. 'fr', 'ar')
 * @param {string} voiceOverride — explicit voice requested by caller
 * @returns {{ engine: 'edge-tts'|'kokoro'|'elevenlabs', voice: string }}
 */
function resolveTTSEngine(language, voiceOverride) {
  const lang = (language || 'en').toLowerCase();

  // Force ElevenLabs for known better-sounding languages
  if (ELEVENLABS_PREFERRED_LANGS.has(lang) && ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key') {
    return { engine: 'elevenlabs', voice: voiceOverride || ELEVENLABS_VOICE_ID };
  }

  // Primary is Edge TTS (free, no API key, many languages)
  return {
    engine: 'edge-tts',
    voice: voiceOverride || EDGE_TTS_DEFAULT_VOICE[lang] || 'en-US-AriaNeural'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TTS function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert text to speech.
 *
 * @param {object} opts
 *   text        {string}  — the text to speak
 *   language    {string}  — BCP-47 language code (default: 'en')
 *   voice       {string}  — explicit voice override (optional)
 *   speed       {number}  — speech speed multiplier (default: 1.0)
 *   useFallback {boolean} — force ElevenLabs even for supported languages
 *
 * @returns {{ audio: Buffer, engine: string, language: string, voice: string, success: true }}
 */
async function tts({ text, language = 'en', voice, speed = 1.0, useFallback = false }) {
  const { engine, voice: resolvedVoice } = resolveTTSEngine(language, voice);

  // ── Try Edge TTS (Primary, free, no API key)
  if (engine === 'edge-tts' && !useFallback) {
    try {
      console.log(`TTS: Edge TTS (lang=${language}, voice=${resolvedVoice})`);
      
      // Convert speed multiplier to Edge TTS rate format (e.g., 1.5 → "+50%", 0.8 → "-20%")
      // If speed is 1.0 (default), skip the rate parameter entirely to avoid errors
      let tts;
      const rate = Math.round((speed - 1) * 100);
      if (rate === 0) {
        // Default speed: no rate parameter
        tts = new EdgeTTS(text, resolvedVoice);
      } else {
        const rateStr = `${rate > 0 ? '+' : ''}${rate}%`;
        tts = new EdgeTTS(text, resolvedVoice, { rate: rateStr });
      }
      
      const result = await tts.synthesize();
      
      // result.audio is a Blob (or ReadableStream?), let's get ArrayBuffer first
      let audioBuffer;
      if (result.audio.arrayBuffer) {
        audioBuffer = await result.audio.arrayBuffer();
      } else if (Buffer.isBuffer(result.audio)) {
        audioBuffer = result.audio;
      } else {
        audioBuffer = result.audio;
      }
      
      return {
        audio:    Buffer.from(audioBuffer),
        engine:   'edge-tts',
        language,
        voice:    resolvedVoice,
        success:  true
      };
    } catch (error) {
      console.warn(`TTS: Edge TTS failed (${language}) — falling back:`, error.message);
      // Try again with no speed parameter just in case
      try {
        console.log(`TTS: Retrying Edge TTS with default settings (lang=${language}, voice=${resolvedVoice})`);
        const tts = new EdgeTTS(text, resolvedVoice);
        const result = await tts.synthesize();
        let audioBuffer;
        if (result.audio.arrayBuffer) {
          audioBuffer = await result.audio.arrayBuffer();
        } else if (Buffer.isBuffer(result.audio)) {
          audioBuffer = result.audio;
        } else {
          audioBuffer = result.audio;
        }
        return {
          audio:    Buffer.from(audioBuffer),
          engine:   'edge-tts',
          language,
          voice:    resolvedVoice,
          success:  true
        };
      } catch (retryError) {
        console.warn(`TTS: Edge TTS retry failed:`, retryError.message);
      }
    }
  }

  // ── Try Kokoro
  const kokoroLang = KOKORO_LANG_MAP[(language || 'en').toLowerCase()];
  if (kokoroLang) {
    try {
      console.log(`TTS: Kokoro (lang=${kokoroLang}, voice=${KOKORO_DEFAULT_VOICE[(language || 'en').toLowerCase()] || 'af_bella'})`);
      const res = await axios.post(
        `${KOKORO_URL}/tts`,
        { text, language: kokoroLang, voice: voice || KOKORO_DEFAULT_VOICE[(language || 'en').toLowerCase()] || 'af_bella', speed },
        { responseType: 'arraybuffer', timeout: 30000 }
      );
      return {
        audio:    Buffer.from(res.data),
        engine:   'kokoro',
        language,
        voice:    voice || KOKORO_DEFAULT_VOICE[(language || 'en').toLowerCase()] || 'af_bella',
        success:  true
      };
    } catch (error) {
      console.warn(`TTS: Kokoro failed (${language}) — falling back:`, error.message);
    }
  }

  // ── Try ElevenLabs (multilingual v2)
  if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key') {
    try {
      console.log(`TTS: ElevenLabs eleven_multilingual_v2 (lang=${language})`);
      const res = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed }
        },
        {
          headers: {
            'xi-api-key':   ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );
      return {
        audio:   Buffer.from(res.data),
        engine:  'elevenlabs',
        language,
        voice:   ELEVENLABS_VOICE_ID,
        success: true
      };
    } catch (error) {
      console.error('TTS: ElevenLabs also failed:', error.message);
    }
  } else {
    console.warn('TTS: No valid ElevenLabs API key configured — set ELEVENLABS_API_KEY in .env');
  }

  throw new Error(`All TTS engines failed for language: ${language}`);
}

/**
 * Get the list of supported languages and which engine handles each.
 */
function getSupportedLanguages() {
  const langs = {};
  for (const [code, voice] of Object.entries(EDGE_TTS_DEFAULT_VOICE)) {
    langs[code] = { engine: 'edge-tts', voice };
  }
  langs['*'] = { engine: 'edge-tts', note: 'All other languages use Edge TTS with appropriate voice' };
  return langs;
}

module.exports = { tts, getSupportedLanguages, resolveTTSEngine };

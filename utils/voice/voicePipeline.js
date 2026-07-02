/**
 * Voice Pipeline — STT → AI Fusion (Multilanguage v2)
 *
 * Full voice request flow:
 *   Audio Buffer → Unified STT Engine (language-aware)
 *               → AI Response Fusion (responds in detected language)
 *               → Enriched result with sttMeta + language info
 */

'use strict';

const sttEngine      = require('./sttEngine');
const responseFusion = require('./responseFusion');

/**
 * Handle full voice request: STT transcription → AI response
 *
 * @param {Buffer} audioBuffer  — 16kHz mono 16-bit PCM WAV
 * @param {Array}  history      — conversation history
 * @param {object} options      — { strategy, language }
 *   language: 'en' (default) | 'auto' | 'fr' | 'ar' | 'zh' | ...
 *   strategy: 'parallel' | 'whisper-first' | 'vosk-first'
 * @returns {Promise<object>}
 */
async function handleVoiceRequest(audioBuffer, history = [], options = {}) {
  const language = (options.language || process.env.STT_DEFAULT_LANGUAGE || 'en').toLowerCase();

  console.log(`🎤 [Voice Pipeline] Transcribing audio — lang: ${language} | strategy: ${options.strategy || 'default'}`);

  // ── Step 1: Transcribe with unified multilanguage engine
  const sttResult = await sttEngine.transcribe(audioBuffer, { ...options, language });

  const userText = sttResult.text;

  if (!userText || userText.trim() === '') {
    throw new Error('Could not understand audio — please speak clearly and try again');
  }

  const resolvedLanguage = sttResult.detectedLanguage || language;
  const languageName     = sttResult.languageName || sttEngine.getLanguageName(resolvedLanguage);

  console.log(`📝 [Voice Pipeline] Heard: "${userText}" | lang: ${resolvedLanguage} (${languageName}) | engine: ${sttResult.engine} | conf: ${sttResult.confidence.toFixed(2)}`);

  // ── Step 2: Send to AI fusion with language instruction
  console.log(`🧠 [Voice Pipeline] Sending to AI — responding in ${languageName}...`);

  let aiResponse = null;
  let aiError = null;
  try {
    aiResponse = await responseFusion.generate({
      prompt:   userText,
      history,
      language: resolvedLanguage,
      max_tokens:  1024,
      temperature: 0.7
    });
    console.log('✅ [Voice Pipeline] AI response ready');
  } catch (error) {
    console.warn('⚠️  [Voice Pipeline] AI response generation failed:', error.message);
    aiError = error.message;
    console.log('ℹ️  [Voice Pipeline] Returning transcription without AI response');
    aiResponse = { response: null, final: null, merged: null };
  }

  const responseText = aiResponse.final || aiResponse.merged || aiResponse.response || null;
  const cleanResponse = typeof responseText === 'string' ? responseText.trim() : responseText;
  const result = {
    success:  true,
    userText,
    response: cleanResponse || null,
    model:    'merge',
    topic:    aiResponse.topic || 'general',
    fromCache: false,
    language:  resolvedLanguage,
    languageName,
    aiError:  cleanResponse ? null : (aiError || 'AI did not return a response. Check model servers or fallback configuration.'),
    // ── Enriched STT telemetry
    sttMeta: {
      engine:           sttResult.engine,
      strategy:         sttResult.strategy,
      language:         resolvedLanguage,
      detectedLanguage: sttResult.detectedLanguage,
      languageName,
      confidence: parseFloat(sttResult.confidence.toFixed(4)),
      latency: {
        vosk:    sttResult.latency.vosk,
        whisper: sttResult.latency.whisper,
        total:   sttResult.latency.total
      }
    }
  };
}

module.exports = { handleVoiceRequest };

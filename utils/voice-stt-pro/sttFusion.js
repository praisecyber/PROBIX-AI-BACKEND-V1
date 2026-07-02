/**
 * STT Fusion — Multilanguage Bridge to Unified STT Engine v2
 *
 * Used by the STT Pro WebSocket server.
 * Delegates to sttEngine with full language support.
 *
 * transcribeFusion(buffer, opts)     → string   (backward-compatible)
 * transcribeFusionFull(buffer, opts) → full result object with language fields
 */

'use strict';

const sttEngine = require('../voice/sttEngine');

/**
 * Transcribe audio — returns plain text (backward-compatible).
 *
 * @param {Buffer} audioBuffer
 * @param {object} [options]  — { strategy, language }
 * @returns {Promise<string>}
 */
async function transcribeFusion(audioBuffer, options = {}) {
  const result = await sttEngine.transcribe(audioBuffer, {
    strategy: options.strategy || 'parallel',
    language: options.language || 'en',
    ...options
  });

  console.log(`[STT Fusion] Engine: ${result.engine} | Lang: ${result.detectedLanguage || result.language} (${result.languageName}) | Conf: ${result.confidence.toFixed(2)} | "${result.text}"`);
  return result.text;
}

/**
 * Transcribe audio — returns full telemetry including language fields.
 *
 * @param {Buffer} audioBuffer
 * @param {object} [options]  — { strategy, language }
 * @returns {Promise<{ text, engine, strategy, language, detectedLanguage, languageName, confidence, latency }>}
 */
async function transcribeFusionFull(audioBuffer, options = {}) {
  return sttEngine.transcribe(audioBuffer, {
    strategy: options.strategy || 'parallel',
    language: options.language || 'en',
    ...options
  });
}

module.exports = { transcribeFusion, transcribeFusionFull };

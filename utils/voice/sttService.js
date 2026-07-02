/**
 * VOSK STT SERVICE — Backward-Compatible Wrapper
 *
 * This module now delegates ALL transcription to the unified sttEngine.
 * Existing callers that import { transcribeAudio, transcribeStream }
 * continue to work unchanged.
 *
 * For new callers, prefer importing sttEngine directly for full telemetry.
 */

'use strict';

const sttEngine = require('./sttEngine');

/**
 * Transcribe an audio buffer to text (backward-compatible).
 * @param {Buffer} audioBuffer — 16kHz mono 16-bit PCM WAV
 * @param {object} [options]   — { strategy: 'parallel'|'whisper-first'|'vosk-first' }
 * @returns {Promise<string>}  — transcribed text
 */
async function transcribeAudio(audioBuffer, options = {}) {
  const result = await sttEngine.transcribe(audioBuffer, options);
  return result.text;
}

/**
 * Transcribe a live audio stream (backward-compatible).
 * @param {NodeJS.ReadableStream} audioStream
 * @param {function} onPartialResult
 * @param {function} onFinalResult  — receives plain text string (legacy)
 * @param {object}   [options]
 */
function transcribeStream(audioStream, onPartialResult, onFinalResult, options = {}) {
  sttEngine.transcribeStream(
    audioStream,
    {
      onPartial: onPartialResult,
      // Unwrap result object to plain string for backward compat
      onFinal: (result) => {
        if (onFinalResult) onFinalResult(result.text || '');
      },
      onError: (err) => {
        console.error('[sttService] Stream error:', err.message);
        if (onFinalResult) onFinalResult('');
      }
    },
    options
  );
}

module.exports = { transcribeAudio, transcribeStream };

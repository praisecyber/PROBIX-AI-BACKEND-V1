/**
 * VAD Handler — Voice Activity Detection + Partial Transcription
 *
 * Uses Vosk via the unified sttEngine for real-time partial results
 * during WebSocket streaming. Detects silence to signal end of speech.
 */

'use strict';

const vosk = require('vosk');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const VOSK_MODEL_PATH = process.env.VOSK_MODEL_PATH
  ? path.resolve(process.env.VOSK_MODEL_PATH)
  : path.join(ROOT, 'vosk-whisper', 'vosk', 'vosk-model-small-en-us-0.15');

let _voskModel = null;

// Attempt to load the Vosk model (shared model singleton per process)
try {
  if (fs.existsSync(VOSK_MODEL_PATH)) {
    vosk.setLogLevel(-1);
    _voskModel = new vosk.Model(VOSK_MODEL_PATH);
    console.log('✅ [VAD Handler] Vosk model loaded for streaming');
  } else {
    console.warn('⚠️  [VAD Handler] Vosk model not found — partial results disabled');
  }
} catch (err) {
  console.error('❌ [VAD Handler] Vosk load error:', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// VadSession — one instance per WebSocket connection
// ─────────────────────────────────────────────────────────────────────────────
class VadSession {
  /**
   * @param {object} options
   * @param {number} options.silenceThreshold — RMS amplitude below = silence (default 300)
   * @param {number} options.maxSilenceChunks — chunks of silence before EOS (default 25 ≈ 1.5s)
   */
  constructor(options = {}) {
    this.silenceThreshold = options.silenceThreshold || 300;
    this.maxSilenceChunks = options.maxSilenceChunks || 25;

    this.silenceChunks = 0;
    this.hasSpoken     = false;
    this.lastPartial   = '';

    this.recognizer = _voskModel
      ? new vosk.Recognizer({ model: _voskModel, sampleRate: 16000 })
      : null;
  }

  // ── RMS energy — used for voice activity detection
  _computeRMS(buffer) {
    const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    let sum = 0;
    for (let i = 0; i < int16.length; i++) sum += int16[i] * int16[i];
    return Math.sqrt(sum / int16.length);
  }

  /**
   * Process one audio chunk from the WebSocket stream.
   * Returns partial text if speech detected, empty string for silence.
   *
   * @param {Buffer} chunk
   * @returns {string} partial transcript text
   */
  processChunk(chunk) {
    const rms = this._computeRMS(chunk);

    // ── Silence detection
    if (rms < this.silenceThreshold) {
      this.silenceChunks++;
      return '';
    }

    this.hasSpoken = true;
    this.silenceChunks = 0;

    // ── Vosk partial transcription
    if (this.recognizer) {
      try {
        if (this.recognizer.acceptWaveform(chunk)) {
          const result = JSON.parse(this.recognizer.result());
          this.lastPartial = result.text;
          return result.text;
        } else {
          const partial = JSON.parse(this.recognizer.partialResult());
          if (partial.partial && partial.partial !== this.lastPartial) {
            this.lastPartial = partial.partial;
            return partial.partial;
          }
        }
      } catch (err) {
        console.error('[VAD] Chunk processing error:', err.message);
      }
    }

    return '';
  }

  /**
   * Has speech occurred and then gone silent long enough to signal EOS?
   * @returns {boolean}
   */
  isEndOfSpeech() {
    return this.hasSpoken && this.silenceChunks >= this.maxSilenceChunks;
  }

  /**
   * Get the Vosk final result from accumulated stream data.
   * @returns {string}
   */
  getFinalResult() {
    if (!this.recognizer) return '';
    try {
      const r = JSON.parse(this.recognizer.finalResult());
      return (r.text || '').trim();
    } catch {
      return '';
    }
  }

  /**
   * Reset session state for a new utterance.
   */
  reset() {
    this.silenceChunks = 0;
    this.hasSpoken     = false;
    this.lastPartial   = '';

    if (this.recognizer && _voskModel) {
      try { this.recognizer.free(); } catch {}
      this.recognizer = new vosk.Recognizer({ model: _voskModel, sampleRate: 16000 });
    }
  }

  /**
   * Release recognizer memory. Call on WebSocket close.
   */
  free() {
    if (this.recognizer) {
      try { this.recognizer.free(); } catch {}
      this.recognizer = null;
    }
  }
}

module.exports = { VadSession };

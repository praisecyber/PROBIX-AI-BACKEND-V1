/**
 * @module routes/stt
 * STT REST Routes — POST /api/stt/speak
 *
 * Accepts a WAV audio file and returns a transcription + AI response.
 * Powered by the unified Vosk+Whisper STT engine with full telemetry.
 */

'use strict';

const express = require('express');
const multer  = require('multer');
const { protect }         = require('../middleware/authMiddleware');
const { userRateLimiter } = require('../middleware/userRateLimiter');
const { handleVoiceRequest } = require('../utils/voice/voicePipeline');
const sttEngine = require('../utils/voice/sttEngine');

const router = express.Router();

// Memory storage — no disk writes for uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/stt/speak:
 *   post:
 *     tags:
 *       - STT
 *     summary: Voice-to-Text → AI Response (Vosk + Whisper Fusion)
 *     description: |
 *       Upload a WAV audio file and receive a full AI response.
 *       Uses the unified Vosk+Whisper STT engine with multilanguage support.
 *
 *       **Strategies (English only):**
 *       - `parallel` (default) — both engines run simultaneously; best result wins
 *       - `whisper-first` — Whisper first, Vosk fallback
 *       - `vosk-first` — Vosk first, Whisper fallback
 *
 *       **Language support:**
 *       - `en` (default) — English: Vosk + Whisper EN parallel fusion
 *       - `auto` — Auto-detect: Whisper multilingual detects the language
 *       - `fr`, `ar`, `zh`, `hi`, `de`, `es`, `ru`, ... — Force specific language
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: WAV file (16kHz, mono, 16-bit PCM)
 *               history:
 *                 type: string
 *                 description: JSON-encoded conversation history array
 *               strategy:
 *                 type: string
 *                 enum: [parallel, whisper-first, vosk-first]
 *                 description: STT engine selection strategy (English only)
 *               language:
 *                 type: string
 *                 description: |
 *                   BCP-47 language code. Use 'auto' for automatic language detection.
 *                   Non-English languages always use Whisper multilingual model.
 *                 example: 'fr'
 *     responses:
 *       200:
 *         description: Transcription + AI response with multilanguage STT telemetry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userText:
 *                   type: string
 *                   description: Transcribed speech (in the spoken language)
 *                 response:
 *                   type: string
 *                   description: AI-generated reply (in the spoken language)
 *                 language:
 *                   type: string
 *                   description: Language code used
 *                 languageName:
 *                   type: string
 *                   description: Human-readable language name (e.g. 'French')
 *                 sttMeta:
 *                   type: object
 *                   properties:
 *                     engine:
 *                       type: string
 *                       description: Which engine produced the transcript (whisper|vosk|none)
 *                     strategy:
 *                       type: string
 *                     language:
 *                       type: string
 *                     detectedLanguage:
 *                       type: string
 *                       description: Auto-detected language code (null if not auto-detect)
 *                     languageName:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     latency:
 *                       type: object
 *                       properties:
 *                         vosk:    { type: number }
 *                         whisper: { type: number }
 *                         total:   { type: number }
 *       400:
 *         description: No audio file or could not understand speech
 *       500:
 *         description: Internal server error
 */
router.post(
  '/speak',
  // protect,  // Temporarily removed for testing
  userRateLimiter(),
  upload.single('audio'),
  async (req, res) => {
    try {
      // Validate audio file presence
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided. Upload a WAV file in the "audio" field.'
        });
      }

      // Parse optional fields
      const history  = req.body.history  ? JSON.parse(req.body.history)  : [];
      const strategy = req.body.strategy || undefined;
      const language = req.body.language || undefined; // undefined → engine uses STT_DEFAULT_LANGUAGE

      // Run voice pipeline (STT + AI)
      const result = await handleVoiceRequest(req.file.buffer, history, { strategy, language });

      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ [STT Route] Error:', error.message);

      if (error.message.includes('Could not understand')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error during voice processing'
      });
    }
  }
);

/**
 * @swagger
 * /api/stt/status:
 *   get:
 *     tags:
 *       - STT
 *     summary: STT Engine health & model status
 *     description: Returns the load status of both Vosk and Whisper models.
 *     responses:
 *       200:
 *         description: STT engine status
 */
router.get('/status', (req, res) => {
  return res.status(200).json({
    success: true,
    sttEngine: sttEngine.getStatus()
  });
});

module.exports = router;

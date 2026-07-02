const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

/**
 * @swagger
 * tags:
 *   - name: Voice
 *     description: Voice AI endpoints (text generation + TTS)
 */

/**
 * @swagger
 * /api/voice/generate:
 *   post:
 *     tags:
 *       - Voice
 *     summary: Generate text from prompt
 *     description: |
 *       Generate text using:
 *       - `mistral` (default): Primary Intelligence Engine - fast, reasoning, coding
 *       - `gemma`: Quality & Education Engine - simplified explanations
 *       - `fusion` or `pipeline` or `both`: Two-step pipeline (Mistral draft → Gemma refine)
 *       - `merge`: Response Fusion Layer (parallel generation & merge of both models)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *               model:
                 type: string
                 description: "'mistral' | 'gemma' | 'fusion' | 'merge'"
 *               userId:
 *                 type: string
 *                 description: Optional - for memory layer
 *               useMemory:
 *                 type: boolean
 *                 description: Enable/disable memory layer (default true)
 *               max_tokens:
 *                 type: number
 *                 description: Max tokens per response
 *               temperature:
 *                 type: number
 *             required:
 *               - prompt
 *     responses:
 *       200:
 *         description: Generated text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 model:
 *                   type: string
 *                 response:
 *                   type: string
 */
router.post('/generate', voiceController.generate);

/**
 * @swagger
 * /api/voice/tts:
 *   post:
 *     tags:
 *       - Voice
 *     summary: Convert text to speech using Kokoro or ElevenLabs fallback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               language:
 *                 type: string
 *               voice:
 *                 type: string
 *               speed:
 *                 type: number
 *               useFallback:
 *                 type: boolean
 *                 description: Skip Kokoro and use ElevenLabs directly
 *             required:
 *               - text
 *     responses:
 *       200:
 *         description: WAV audio file
 */
router.post('/tts', voiceController.tts);

/**
 * @swagger
 * /api/voice/memory/{userId}:
 *   get:
 *     tags:
 *       - Voice
 *     summary: Get user's memory context (conversation history, profile, etc.)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Memory context
 */
router.get('/memory/:userId', voiceController.getMemory);

/**
 * @swagger
 * /api/voice/memory/{userId}:
 *   delete:
 *     tags:
 *       - Voice
 *     summary: Clear user's conversation memory
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Memory cleared
 */
router.delete('/memory/:userId', voiceController.clearMemory);

module.exports = router;

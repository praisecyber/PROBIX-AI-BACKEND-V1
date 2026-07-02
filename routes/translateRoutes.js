const express = require("express");
const router = express.Router();
const {
  translateText,
  getSupportedLanguages,
  translateAndVerify,
  verifySteps,
} = require("../controllers/translateController");

/**
 * @swagger
 * tags:
 *   name: Translation
 *   description: Universal translation services using NLLB-200
 */

/**
 * @swagger
 * /api/translate:
 *   post:
 *     summary: Translate text
 *     tags:
 *       - Translation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: "The text to translate"
 *                 example: "Welcome to Probix AI"
 *               sourceLang:
 *                 type: string
 *                 description: "Source language code - default eng_Latn"
 *                 example: "eng_Latn"
 *               targetLang:
 *                 type: string
 *                 description: "Target language code - default yor_Latn"
 *                 example: "yor_Latn"
 *     responses:
 *       200:
 *         description: Translation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalText:
 *                       type: string
 *                     translatedText:
 *                       type: string
 *                     sourceLang:
 *                       type: string
 *                     targetLang:
 *                       type: string
 *       400:
 *         description: Missing text
 *       500:
 *         description: Translation failed
 */
router.post("/", translateText);

/**
 * @swagger
 * /api/translate/languages:
 *   get:
 *     summary: Get all supported languages
 *     description: Returns a complete list of 202 supported languages and their NLLB codes
 *     tags: [Translation]
 *     responses:
 *       200:
 *         description: List of supported languages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 */
router.get("/languages", getSupportedLanguages);

/**
 * @swagger
 * /api/translate/verify:
 *   post:
 *     summary: Translate text and verify any detected math expressions
 *     tags:
 *       - Translation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to translate
 *               sourceLang:
 *                 type: string
 *                 description: Source language code
 *               targetLang:
 *                 type: string
 *                 description: Target language code
 *     responses:
 *       200:
 *         description: Translation and math verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalText:
 *                       type: string
 *                     translatedText:
 *                       type: string
 *                     sourceLang:
 *                       type: string
 *                     targetLang:
 *                       type: string
 *                     mathChecks:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Missing text
 *       500:
 *         description: Translation or verification failed
 */
router.post("/verify", translateAndVerify);

/**
 * @swagger
 * /api/translate/verify-steps:
 *   post:
 *     summary: Verify a list of math steps from the LLM
 *     tags:
 *       - Translation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - steps
 *             properties:
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     step_id:
 *                       type: integer
 *                     expression:
 *                       type: string
 *                     expected:
 *                       type: string
 *                     variables:
 *                       type: object
 *     responses:
 *       200:
 *         description: Verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     checks:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Verification failed
 */
router.post("/verify-steps", verifySteps);

module.exports = router;

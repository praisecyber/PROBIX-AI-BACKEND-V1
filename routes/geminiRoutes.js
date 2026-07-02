const express = require("express");
const router = express.Router();
const { geminiMathTutor } = require("../controllers/geminiController");
const { protect } = require("../middleware/authMiddleware");
const { userRateLimiter } = require("../middleware/userRateLimiter");

/**
 * @swagger
 * tags:
 *   name: Gemini
 *   description: Gemini 3.1 Flash math and STEM tutoring
 */

/**
 * @swagger
 * /api/gemini/math:
 *   post:
 *     summary: Solve and explain math/STEM problems using Gemini 3.1 Flash
 *     tags:
 *       - Gemini
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 description: The math or STEM question to solve
 *                 example: "Solve 2*x+4=0 for x"
 *               language:
 *                 type: string
 *                 description: Language to use for the explanation
 *                 example: "English"
 *               verify:
 *                 type: boolean
 *                 description: Whether to verify extracted math steps with the math service
 *                 default: true
 *     responses:
 *       200:
 *         description: Gemini answer and optional verification results
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
 *                     geminiModel:
 *                       type: string
 *                     question:
 *                       type: string
 *                     language:
 *                       type: string
 *                     verifyMath:
 *                       type: boolean
 *                     rawResponse:
 *                       type: string
 *                     structuredAnswer:
 *                       type: object
 *                     verificationResults:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Missing question
 *       500:
 *         description: Gemini service failed
 */
// Apply authentication first, then per-user rate limiting (50 requests/day per user)
router.post(
  "/math",
  protect,
  userRateLimiter({ dailyLimit: 50, endpointName: "gemini/math" }),
  geminiMathTutor
);

module.exports = router;

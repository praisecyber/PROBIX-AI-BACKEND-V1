const express = require("express");
const router = express.Router();

const {
  completeQuest,
  getLeaderboard,
  getMyStats,
} = require("../controllers/gamificationController");

// Assuming you have standard authentication middleware to verify the JWT
// Adjust the path if your middleware is named differently
const { protect } = require("../middleware/authMiddleware");
const { userRateLimiter } = require("../middleware/userRateLimiter");

/**
 * @swagger
 * /api/gamification/complete-quest:
 *   post:
 *     summary: Complete a quest and earn XP
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               xpReward:
 *                 type: number
 *                 example: 50
 *               isCorrect:
 *                 type: boolean
 *                 example: true
 *               sourceText:
 *                 type: string
 *                 example: "Hello"
 *               targetText:
 *                 type: string
 *                 example: "Bonjour"
 *               targetLangCode:
 *                 type: string
 *                 example: "fra_Latn"
 *     responses:
 *       200:
 *         description: Quest completed and stats updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 predictionMessage:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     leveledUp:
 *                       type: boolean
 *                     predictedSuccessRate:
 *                       type: number
 *                     stats:
 *                       $ref: '#/components/schemas/GamificationStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/complete-quest", protect, userRateLimiter({ endpointName: "gamification/complete-quest", trackOnly: true }), completeQuest);

/**
 * @swagger
 * /api/gamification/my-stats:
 *   get:
 *     summary: Retrieve authenticated user's gamification stats
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user stats
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
 *                     stats:
 *                       $ref: '#/components/schemas/GamificationStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/my-stats", protect, userRateLimiter({ endpointName: "gamification/my-stats", trackOnly: true }), getMyStats);

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     summary: Get leaderboard sorted by streak and XP
 *     tags: [Gamification]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Maximum number of leaderboard entries to return
 *     responses:
 *       200:
 *         description: Leaderboard data
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
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GamificationStats'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/leaderboard", getLeaderboard); // Make leaderboard public, or add 'protect' if only users should see it

module.exports = router;
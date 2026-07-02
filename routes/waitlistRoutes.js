const express = require("express");
const router = express.Router();

const {
  joinWaitlist,
  checkWaitlistStatus,
  getMyWaitlistStatus,
  getWaitlistCount,
} = require("../controllers/waitlistController");
const { waitlistValidation } = require("../middleware/validators");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/waitlist/join:
 *   post:
 *     summary: Join the waitlist
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Successfully added to waitlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Waitlist'
 *       400:
 *         description: Validation error or already on waitlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/join", waitlistValidation, joinWaitlist);

/**
 * @swagger
 * /api/waitlist/status:
 *   get:
 *     summary: Check waitlist status by email
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         required: true
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: Waitlist status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Waitlist'
 *       404:
 *         description: Email not found on waitlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/status", checkWaitlistStatus);

/**
 * @swagger
 * /api/waitlist/my-status:
 *   get:
 *     summary: Get logged-in user's waitlist status
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's waitlist status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Waitlist'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not on waitlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/my-status", protect, getMyWaitlistStatus);

/**
 * @swagger
 * /api/waitlist/count:
 *   get:
 *     summary: Get total waitlist count
 *     tags: [Waitlist]
 *     responses:
 *       200:
 *         description: Total waitlist count
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
 *                     totalCount:
 *                       type: number
 */
router.get("/count", getWaitlistCount);

module.exports = router;

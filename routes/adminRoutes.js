const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const { deleteUser, getAllUsers, getAllWaitlist, getUserByEmail, sendAdminEmail, verifyAdminPin, createAdminPage } = require("../controllers/authController");
const { deleteUserValidation, verifyPinValidation } = require("../middleware/validators");
const { protect, authorizeAdmin } = require("../middleware/authMiddleware");
const { getDashboardStats, getRequestLogs } = require("../controllers/adminDashboardController");

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users and their details (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden - Admin privileges required
 *       401:
 *         description: Unauthorized
 */
router.get("/users", protect, authorizeAdmin, getAllUsers);

/**
 * @swagger
 * /api/admin/user:
 *   get:
 *     summary: Get a specific user by email (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User email address
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.get("/user", protect, authorizeAdmin, getUserByEmail);

/**
 * @swagger
 * /api/admin/verify-pin:
 *   post:
 *     summary: Verify admin PIN for dashboard access
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: PIN verified successfully
 *       401:
 *         description: Invalid PIN
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post("/verify-pin", protect, authorizeAdmin, verifyPinValidation, verifyAdminPin);

/**
 * @swagger
 * /api/admin/create-page:
 *   post:
 *     summary: Initialize the admin dashboard page (First-time setup - Idempotent)
 *     description: This action can only be performed once. Once successful, the "Create Page" prompt should be hidden in the UI.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin page created successfully
 *       400:
 *         description: Admin page already created
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post("/create-page", protect, authorizeAdmin, createAdminPage);

/**
 * @swagger
 * /api/admin/send-email:
 *   post:
 *     summary: Send a custom email (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, subject, message]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               subject:
 *                 type: string
 *                 example: Important Update from Probix AI
 *               message:
 *                 type: string
 *                 example: Your account has been upgraded to premium.
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post("/send-email", protect, authorizeAdmin, sendAdminEmail);

/**
 * @swagger
 * /api/admin/waitlist:
 *   get:
 *     summary: Get all waitlist entries (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all waitlist entries retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     waitlist:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Waitlist'
 *       403:
 *         description: Forbidden - Admin privileges required
 *       401:
 *         description: Unauthorized
 */
router.get("/waitlist", protect, authorizeAdmin, getAllWaitlist);

/**
 * @swagger
 * /api/admin/delete-user:
 *   delete:
 *     summary: Delete a user and their associated data using email (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin privileges required
 *       401:
 *         description: Unauthorized
 */
router.delete("/delete-user", protect, authorizeAdmin, deleteUserValidation, deleteUser);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *       403:
 *         description: Forbidden
 *       401:
 *         description: Unauthorized
 */
router.get("/dashboard", protect, authorizeAdmin, getDashboardStats);

/**
 * @swagger
 * /api/admin/request-logs:
 *   get:
 *     summary: Get paginated request logs (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Request logs retrieved successfully
 *       403:
 *         description: Forbidden
 *       401:
 *         description: Unauthorized
 */
router.get("/request-logs", protect, authorizeAdmin, getRequestLogs);

module.exports = router;

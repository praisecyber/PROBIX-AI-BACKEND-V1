require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const connectDB = require("./config/db");

// ── Middleware imports
const cloudflareMiddleware = require("./middleware/cloudflareMiddleware");

// ── Route imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const waitlistRoutes = require("./routes/waitlistRoutes");
const translateRoutes = require("./routes/translateRoutes");
const geminiRoutes = require("./routes/geminiRoutes");
const gamificationRoutes = require("./routes/gamificationRoutes");
const voiceRoutes = require("./routes/voiceRoutes");
const sttRoutes = require("./routes/stt");
const { initSTTPro } = require("./utils/voice-stt-pro/server");

// ── Connect to MongoDB
connectDB();

const app = express();

// Trust Cloudflare proxy headers using exactly one trusted proxy hop only in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
} else {
  // In development/tests keep default (no permissive trust) to avoid rate-limit bypass warnings
  app.set('trust proxy', false);
}

// ─────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────
app.use(cloudflareMiddleware); // Cloudflare specific security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      mediaSrc: ["'self'", "blob:"], // Allow blob URLs for audio playback
    },
  },
})); // Sets secure HTTP headers

// CORS — update origins before going to production
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
  keyGenerator: (req /*, res*/) => {
    // Prefer Cloudflare-provided real IP when available (set in cloudflareMiddleware),
    // otherwise fall back to the Express-provided IP.
    return req.realIp || req.ip;
  },
});
app.use(globalLimiter);

// Stricter limiter for auth routes — 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
});

// ─────────────────────────────────────────────
// Body Parser & Logger
// ─────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static("public"));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Probix API is running 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

const healthResponse = () => ({
  success: true,
  message: "OK",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

app.get("/api/health", (req, res) => res.status(200).json(healthResponse()));
app.get("/health", (req, res) => res.status(200).json(healthResponse()));
app.get("/healthz", (req, res) => res.status(200).json(healthResponse()));

// AI services health check (Ollama + Kokoro + ElevenLabs + STT)

// ─────────────────────────────────────────────
// Swagger Documentation
// ─────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/stt", sttRoutes);

// ─────────────────────────────────────────────
// 404 Handler — catch unmatched routes
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(
    `🚀 Probix server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`
  );
  // Initialize STT Pro
  initSTTPro(server, app);
});

// Graceful shutdown
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => process.exit(0));
});

module.exports = app;

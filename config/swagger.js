const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Probix AI Documentation",
      version: "1.0.0",
      description:
        "Probix AI backend API for authentication, waitlist, and universal translation",
      contact: {
        name: "Probix AI Team",
        url: "https://probix.io",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: `${process.env.API_URL || "https://api.probix.io"}`,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Bearer token",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["email", "password", "fullName"],
          properties: {
            id: {
              type: "string",
              description: "User ID (MongoDB ObjectId)",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              description: "Hashed password",
            },
            fullName: {
              type: "string",
              description: "User full name",
            },
            isVerified: {
              type: "boolean",
              default: false,
              description: "Email verification status",
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              default: "user",
              description: "User role (admin or user)",
            },
            registrationSource: {
              type: "string",
              enum: ["Waitlist", "Direct Signup"],
              description: "How the user registered",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },
        Waitlist: {
          type: "object",
          required: ["email"],
          properties: {
            id: {
              type: "string",
              description: "Waitlist entry ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              default: "pending",
              description: "Waitlist status",
            },
            joinedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when added to waitlist",
            },
          },
        },
        GamificationStats: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ObjectId",
            },
            username: {
              type: "string",
              description: "User display name",
            },
            xp: {
              type: "number",
              description: "Total experience points",
            },
            level: {
              type: "number",
              description: "Current gamification level",
            },
            streak: {
              type: "number",
              description: "Current streak count",
            },
            totalInputs: {
              type: "number",
              description: "Total inputs submitted",
            },
            correctAnswers: {
              type: "number",
              description: "Total correct answers",
            },
            successRate: {
              type: "number",
              description: "Success rate percentage",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
          },
        },
      },
    },
  },
  apis: [
    "./routes/authRoutes.js",
    "./routes/adminRoutes.js",
    "./routes/waitlistRoutes.js",
    "./routes/translateRoutes.js",
    "./routes/geminiRoutes.js",
    "./routes/gamificationRoutes.js",
    "./routes/stt.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

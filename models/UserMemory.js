const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// ProUnique Mistral 7B — User Long-Term Memory
// ─────────────────────────────────────────────
// Stores cross-session facts, summaries and
// user preferences for the memory layer.
//
// Memory Types:
//   • facts          — Key-value knowledge about the user
//   • sessionSummaries — LLM-generated summaries of past sessions
//   • preferences    — Language, response style settings
// ─────────────────────────────────────────────

const factSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: ["user_explicit", "inferred", "system"],
    default: "inferred"
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const sessionSummarySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true,
    maxlength: 2000
  },
  keyTopics: [String],     // E.g. ["coding", "python", "web scraping"]
  language: {
    type: String,
    default: "en"
  },
  turnCount: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  // Short profile facts (e.g. "user is a student", "user prefers Python")
  facts: {
    type: [factSchema],
    default: []
  },

  // LLM-generated summaries of completed sessions
  sessionSummaries: {
    type: [sessionSummarySchema],
    default: []
  },

  // Persistent preferences (override VoiceSession.userPreferences)
  preferences: {
    preferredLanguage: {
      type: String,
      default: "en"
    },
    responseStyle: {
      type: String,
      enum: ["concise", "detailed", "educational"],
      default: "detailed"
    },
    ttsEnabled: {
      type: Boolean,
      default: true
    },
    preferredVoice: String // Override Kokoro voice selection
  },

  // Stats
  totalSessions: {
    type: Number,
    default: 0
  },
  totalTurns: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook
userMemorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// ── Instance Methods ────────────────────────────────────────────────────────

/**
 * Add or update a fact in long-term memory.
 * If a fact with the same key exists, it is updated.
 */
userMemorySchema.methods.upsertFact = function (key, value, options = {}) {
  const existing = this.facts.find(f => f.key === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = new Date();
    if (options.confidence !== undefined) existing.confidence = options.confidence;
    if (options.source !== undefined) existing.source = options.source;
  } else {
    this.facts.push({
      key,
      value,
      source: options.source || "inferred",
      confidence: options.confidence || 0.8,
      updatedAt: new Date()
    });
  }
};

/**
 * Add a session summary (cap at 20 most recent to avoid bloat).
 */
userMemorySchema.methods.addSessionSummary = function (summary) {
  this.sessionSummaries.push(summary);
  if (this.sessionSummaries.length > 20) {
    // Keep the 20 most recent
    this.sessionSummaries = this.sessionSummaries.slice(-20);
  }
};

/**
 * Build a formatted context string for injection into the system prompt.
 * @returns {string}
 */
userMemorySchema.methods.toContextString = function () {
  const lines = [];

  if (this.facts.length > 0) {
    lines.push("Known facts about this user:");
    this.facts.slice(-10).forEach(f => {
      lines.push(`  - ${f.key}: ${f.value}`);
    });
  }

  if (this.sessionSummaries.length > 0) {
    const recent = this.sessionSummaries.slice(-3);
    lines.push("\nRecent conversation context:");
    recent.forEach(s => {
      lines.push(`  [${s.createdAt.toDateString()}] ${s.summary}`);
    });
  }

  return lines.join("\n");
};

const UserMemory = mongoose.model("UserMemory", userMemorySchema);

module.exports = UserMemory;

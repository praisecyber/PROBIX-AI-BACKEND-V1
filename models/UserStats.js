const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    streak: {
      type: Number,
      default: 0,
    },
    totalInputs: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const UserStats = mongoose.model('UserStats', userStatsSchema);
module.exports = UserStats;

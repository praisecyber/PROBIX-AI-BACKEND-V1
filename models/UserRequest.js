const mongoose = require("mongoose");

const userRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true, // e.g. "gemini/math", "translate"
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  requestId: {
    type: String,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
});

// Index for fast daily queries (critical for performance!)
userRequestSchema.index({ userId: 1, endpoint: 1, date: 1 });

// Static method to count requests for a user/endpoint/day
userRequestSchema.statics.countUserRequestsToday = async function (userId, endpoint) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0); // Set to 12:00:00 AM today

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999); // Set to 11:59:59 PM today

  return await this.countDocuments({
    userId,
    endpoint,
    date: { $gte: startOfDay, $lte: endOfDay },
  });
};

const UserRequest = mongoose.model("UserRequest", userRequestSchema);

module.exports = UserRequest;

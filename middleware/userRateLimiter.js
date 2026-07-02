const UserRequest = require("../models/UserRequest");

// Default daily limit: 50 requests per user per day
const DEFAULT_DAILY_LIMIT = 50;

const userRateLimiter = (options = {}) => {
  const { 
    dailyLimit = DEFAULT_DAILY_LIMIT, 
    endpointName = "general",
    trackOnly = false // If true, just log requests, don't block
  } = options;

  return async (req, res, next) => {
    try {
      // Get user ID from req.user (set by authMiddleware)
      const userId = req.user?._id;

      if (!userId) {
        // If no user is logged in (public endpoint), skip
        return next();
      }

      // 1. Count how many requests the user has made today for this endpoint
      const requestCount = await UserRequest.countUserRequestsToday(userId, endpointName);

      // 2. ONLY check limit if trackOnly is false
      if (!trackOnly && requestCount >= dailyLimit) {
        return res.status(429).json({
          success: false,
          message: `Daily limit of ${dailyLimit} requests reached. Please try again tomorrow.`,
          limit: dailyLimit,
          requestsUsed: requestCount,
        });
      }

      // 3. ALWAYS log this request (even if trackOnly)
      await UserRequest.create({
        userId,
        endpoint: endpointName,
      });

      // 4. Proceed to the endpoint
      const logMessage = trackOnly
        ? `[Tracker] User ${userId} made request ${requestCount + 1} today for ${endpointName}`
        : `[Rate Limiter] User ${userId} made request ${requestCount + 1}/${dailyLimit} today for ${endpointName}`;
      
      console.log(logMessage);
      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      next(error); // Pass to error handler
    }
  };
};

module.exports = { userRateLimiter };

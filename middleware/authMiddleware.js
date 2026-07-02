const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

/**
 * Protect routes — verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid. User no longer exists.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * Check if authenticated user has joined the waitlist
 * Use this on any route that requires waitlist membership
 */
const requireWaitlist = (req, res, next) => {
  if (!req.user.hasJoinedWaitlist) {
    return res.status(403).json({
      success: false,
      message:
        "Access restricted. You must join the waitlist to access this feature.",
      waitlistRequired: true,
    });
  }
  next();
};

/**
 * Restrict access to admin users only
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
};

module.exports = { protect, requireWaitlist, authorizeAdmin };

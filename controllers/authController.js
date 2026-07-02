const jwt = require("jsonwebtoken");
const { User, SUPPORTED_LANGUAGES } = require("../models/User");
const Waitlist = require("../models/Waitlist");
const sendEmail = require("../utils/sendEmail");
const { getWelcomeEmailHtml, getResetPasswordEmailHtml } = require("../utils/emailTemplates");
/**
 * Generate a signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
// ─────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { fullname, email, password, preferredLanguage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Check if this email is already on the waitlist
    const waitlistEntry = await Waitlist.findOne({ email });

    // Create the new user
    const user = await User.create({
      fullname,
      email,
      password,
      preferredLanguage,
      // Auto-link waitlist if email was already registered on waitlist
      hasJoinedWaitlist: !!waitlistEntry,
      waitlistId: waitlistEntry ? waitlistEntry._id : null,
    });

    // If email was on waitlist but not yet linked to a user, link it now
    if (waitlistEntry && !waitlistEntry.userId) {
      waitlistEntry.userId = user._id;
      waitlistEntry.isRegisteredUser = true;
      await waitlistEntry.save();
    }

    // Send Welcome Email
    await sendEmail({
      email: user.email,
      subject: "Welcome to Probix!",
      html: getWelcomeEmailHtml(user.fullname),
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);

    // Handle mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login an existing user
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Compare password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/languages
// @desc    Get list of supported languages (for frontend dropdown)
// @access  Public
// ─────────────────────────────────────────────
const getLanguages = (req, res) => {
  return res.status(200).json({
    success: true,
    data: { languages: SUPPORTED_LANGUAGES },
  });
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get currently authenticated user's profile
// @access  Private
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "waitlistId",
      "position createdAt"
    );

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @desc    Send password reset email with 6-digit code
// @access  Public
// ─────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, we sent a password reset code.",
      });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (expires in 15 mins)
    user.resetPasswordOtp = resetCode; 
    user.resetPasswordOtpExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateModifiedOnly: true });

    // Send email
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code",
      html: getResetPasswordEmailHtml(user.fullname, resetCode),
    });

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, we sent a password reset code.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/verify-reset-code
// @desc    Verify the 6-digit reset code
// @access  Public
// ─────────────────────────────────────────────
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOtp: code,
      resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reset code is valid. You can now reset your password.",
    });
  } catch (error) {
    console.error("Verify Reset Code Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/reset-password
// @desc    Reset password using the code
// @access  Public
// ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    // Find user with valid code
    const user = await User.findOne({
      email,
      resetPasswordOtp: code,
      resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code.",
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save(); // pre-save hook will hash it

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/auth/delete-user
// @desc    Delete a user from the database using their email address
// @access  Public (or Private depending on requirements, but user asked for email-based deletion)
// ─────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user first to check if they exist and to handle linked data
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Delete linked waitlist entry if it exists
    await Waitlist.findOneAndDelete({ email });

    // Delete the user
    await User.findOneAndDelete({ email });

    return res.status(200).json({
      success: true,
      message: "User and associated data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/admin/users
// @desc    Get all users and their information (Admin Only)
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("waitlistId", "position status createdAt")
      .sort("-createdAt");

    // Map users to include a clear registration source
    const usersWithSource = users.map(user => {
      const userObj = user.toJSON();
      return {
        ...userObj,
        registrationSource: user.hasJoinedWaitlist ? "Waitlist" : "Direct Signup"
      };
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: { users: usersWithSource },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/admin/waitlist
// @desc    Get all waitlist entries (Admin Only)
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getAllWaitlist = async (req, res) => {
  try {
    const waitlist = await Waitlist.find()
      .populate("userId", "fullname email role createdAt")
      .sort("-createdAt");

    return res.status(200).json({
      success: true,
      count: waitlist.length,
      data: { waitlist },
    });
  } catch (error) {
    console.error("Get All Waitlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/admin/user
// @desc    Get specific user details by email (Admin Only)
// @access  Private (Admin)
// ─────────────────────────────────────────────
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate("waitlistId", "position status createdAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const userObj = user.toJSON();
    const userWithSource = {
      ...userObj,
      registrationSource: user.hasJoinedWaitlist ? "Waitlist" : "Direct Signup"
    };

    return res.status(200).json({
      success: true,
      data: { user: userWithSource },
    });
  } catch (error) {
    console.error("Get User By Email Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/send-email
// @desc    Send a custom email from the admin panel
// @access  Private (Admin)
// ─────────────────────────────────────────────
const sendAdminEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Email, subject, and message are required.",
      });
    }

    const result = await sendEmail({
      email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4a90e2;">Probix AI - Official Communication</h2>
          <p>${message}</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888888;">Sent from Probix AI Admin Dashboard at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (result && result.data && result.data.id) {
      return res.status(200).json({
        success: true,
        message: "Email sent successfully.",
        data: { emailId: result.data.id },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Email delivery failed. Please check server logs.",
      });
    }
  } catch (error) {
    console.error("Admin Send Email Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/verify-pin
// @desc    Verify admin PIN for dashboard access
// @access  Private (Admin)
// ─────────────────────────────────────────────
const verifyAdminPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required.",
      });
    }

    // Find the current admin and explicitly include adminPin
    const admin = await User.findById(req.user._id).select("+adminPin");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const isMatch = await admin.compareAdminPin(pin);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "PIN verified. Welcome to the Admin Dashboard.",
      hasCreatedPage: admin.hasCreatedAdminPage,
    });
  } catch (error) {
    console.error("Verify PIN Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/create-page
// @desc    Initialize the admin dashboard page
// @access  Private (Admin)
// ─────────────────────────────────────────────
const createAdminPage = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    if (admin.hasCreatedAdminPage) {
      return res.status(400).json({
        success: false,
        message: "Admin page has already been created.",
      });
    }

    admin.hasCreatedAdminPage = true;
    await admin.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Admin page created successfully. This input will not show again.",
    });
  } catch (error) {
    console.error("Create Admin Page Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

module.exports = { signup, login, getLanguages, getMe, forgotPassword, verifyResetCode, resetPassword, deleteUser, getAllUsers, getAllWaitlist, getUserByEmail, sendAdminEmail, verifyAdminPin, createAdminPage };

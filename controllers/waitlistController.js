const Waitlist = require("../models/Waitlist");
const { User } = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { getWaitlistEmailHtml } = require("../utils/emailTemplates");
// ─────────────────────────────────────────────
// @route   POST /api/waitlist/join
// @desc    Join the waitlist
// @access  Public
// ─────────────────────────────────────────────
const joinWaitlist = async (req, res) => {
  try {
    const { fullname, email } = req.body;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check if this email is already on the waitlist
    const existing = await Waitlist.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This email is already on the waitlist.",
        data: {
          position: existing.position,
          joinedAt: existing.createdAt,
        },
      });
    }

    // Check if the email belongs to an existing registered user
    const registeredUser = await User.findOne({ email: normalizedEmail });

    // Create the waitlist entry
    const waitlistEntry = await Waitlist.create({
      fullname,
      email: normalizedEmail,
      userId: registeredUser ? registeredUser._id : null,
      isRegisteredUser: !!registeredUser,
    });

    // If user has an account, update their waitlist status
    if (registeredUser) {
      await User.findByIdAndUpdate(registeredUser._id, {
        hasJoinedWaitlist: true,
        waitlistId: waitlistEntry._id,
      });
    }

    // Send Welcome Email
    await sendEmail({
      email: waitlistEntry.email,
      subject: "You're on the Probix waitlist!",
      html: getWaitlistEmailHtml(waitlistEntry.fullname, waitlistEntry.position),
    });

    return res.status(201).json({
      success: true,
      message: "You have successfully joined the waitlist!",
      data: {
        id: waitlistEntry._id,
        fullname: waitlistEntry.fullname,
        email: waitlistEntry.email,
        status: waitlistEntry.status,
        position: waitlistEntry.position,
        isRegisteredUser: waitlistEntry.isRegisteredUser,
        joinedAt: waitlistEntry.createdAt,
      },
    });
  } catch (error) {
    console.error("Join Waitlist Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already on the waitlist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/waitlist/status
// @desc    Check waitlist status for a given email
// @access  Public
// ─────────────────────────────────────────────
const checkWaitlistStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    const entry = await Waitlist.findOne({ email: email.toLowerCase() });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Email not found on waitlist",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: entry._id,
        email: entry.email,
        status: entry.status,
        joinedAt: entry.createdAt,
      },
    });
  } catch (error) {
    console.error("Check Waitlist Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/waitlist/my-status
// @desc    Get waitlist status of the currently logged-in user
// @access  Private (requires JWT)
// ─────────────────────────────────────────────
const getMyWaitlistStatus = async (req, res) => {
  try {
    const user = req.user;

    if (!user.hasJoinedWaitlist) {
      return res.status(404).json({
        success: false,
        message: "You have not joined the waitlist yet.",
      });
    }

    const entry = await Waitlist.findById(user.waitlistId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Waitlist entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: entry._id,
        email: entry.email,
        status: entry.status,
        joinedAt: entry.createdAt,
      },
    });
  } catch (error) {
    console.error("My Waitlist Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/waitlist/count
// @desc    Get total number of people on the waitlist
// @access  Public
// ─────────────────────────────────────────────
const getWaitlistCount = async (req, res) => {
  try {
    const count = await Waitlist.countDocuments();
    return res.status(200).json({
      success: true,
      data: { totalOnWaitlist: count },
    });
  } catch (error) {
    console.error("Waitlist Count Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

module.exports = {
  joinWaitlist,
  checkWaitlistStatus,
  getMyWaitlistStatus,
  getWaitlistCount,
};

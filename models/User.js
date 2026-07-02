const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SUPPORTED_LANGUAGES = [
  "English", "French", "Spanish", "German", "Italian", "Portuguese",
  "Dutch", "Russian", "Chinese (Simplified)", "Chinese (Traditional)",
  "Japanese", "Korean", "Arabic", "Hindi", "Bengali", "Turkish",
  "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Greek",
  "Czech", "Romanian", "Hungarian", "Ukrainian", "Thai", "Vietnamese",
  "Indonesian", "Malay", "Swahili", "Yoruba", "Igbo", "Hausa",
  "Amharic", "Zulu", "Afrikaans",
];

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password by default
    },
    preferredLanguage: {
      type: String,
      required: [true, "Preferred language is required"],
      enum: {
        values: SUPPORTED_LANGUAGES,
        message: "{VALUE} is not a supported language",
      },
      default: "English",
    },
    // Waitlist tracking
    hasJoinedWaitlist: {
      type: Boolean,
      default: false,
    },
    waitlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Waitlist",
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    adminPin: {
      type: String,
      select: false, // hidden by default
    },
    hasCreatedAdminPage: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password and PIN before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  if (this.isModified("adminPin") && this.adminPin) {
    const salt = await bcrypt.genSalt(12);
    this.adminPin = await bcrypt.hash(this.adminPin, salt);
  }
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare admin PIN method
userSchema.methods.compareAdminPin = async function (candidatePin) {
  if (!this.adminPin) return false;
  return await bcrypt.compare(candidatePin, this.adminPin);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = { User, SUPPORTED_LANGUAGES };

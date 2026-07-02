const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
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
    // If the user already has an account, link them
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Whether this waitlist entry is linked to an existing account
    isRegisteredUser: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    position: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-assign waitlist position before saving
waitlistSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Waitlist").countDocuments();
    this.position = count + 1;
  }
  next();
});

const Waitlist = mongoose.model("Waitlist", waitlistSchema);

module.exports = Waitlist;

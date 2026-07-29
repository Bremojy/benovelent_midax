const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const memberSchema = new mongoose.Schema(
  {
    memberNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      enum: ["member", "admin", "superadmin"],
      default: "member",
    },

    profileImage: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    department: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    monthlyContribution: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    joinDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    unreadNotifications: {
      type: Number,
      default: 0,
    },

    unreadMessages: {
      type: Number,
      default: 0,
    },

    socketId: {
      type: String,
      default: "",
    },

    online: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    lastLogin: {
      type: Date,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
    },

    // =====================================
    // SETTINGS
    // =====================================

    notifications: {
      type: Boolean,
      default: true,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    darkMode: {
      type: Boolean,
      default: false,
    },

    language: {
      type: String,
      default: "English",
    },

    // =====================================
    // SECURITY
    // =====================================

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    accountLockedUntil: {
      type: Date,
      default: null,
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    passwordChangedAt: {
      type: Date,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================
// PASSWORD MATCH
// =====================================

memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  );
};

// =====================================
// HASH PASSWORD
// =====================================

memberSchema.pre("save", async function (next) {

  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );

  next();

});

// =====================================
// INDEXES
// =====================================

memberSchema.index({ email: 1 });
memberSchema.index({ username: 1 });
memberSchema.index({ memberNumber: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ online: 1 });

// =====================================

module.exports =
  mongoose.models.Member ||
  mongoose.model("Member", memberSchema);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    // =====================================
    // BASIC INFORMATION
    // =====================================

    name: {
      type: String,
      trim: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    // =====================================
    // ROLE
    // =====================================

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      immutable: true,
    },

    // =====================================
    // ACCOUNT STATUS
    // =====================================

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
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
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    // =====================================
    // ACTIVITY
    // =====================================

    lastLogin: {
      type: Date,
      default: null,
    },

    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================
// PASSWORD MATCH
// =====================================

adminSchema.methods.matchPassword =
  async function (enteredPassword) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

// =====================================
// HASH PASSWORD
// =====================================

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt =
    await bcrypt.genSalt(10);

  this.password =
    await bcrypt.hash(
      this.password,
      salt
    );
});

// =====================================
// NORMALIZE ADMIN NAME
// =====================================

adminSchema.pre("validate", function () {
  if (!this.name && this.fullName) {
    this.name = this.fullName;
  }

  if (!this.fullName && this.name) {
    this.fullName = this.name;
  }
});

module.exports =
  mongoose.models.Admin ||
  mongoose.model(
    "Admin",
    adminSchema
  );
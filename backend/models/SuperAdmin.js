const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const superAdminSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
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
        enum: ["superadmin"],
        default: "superadmin",
        immutable: true,
      },

      // =====================================
      // ACCOUNT STATUS
      // =====================================

      status: {
        type: String,
        enum: [
          "active",
          "inactive",
          "suspended",
        ],
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

superAdminSchema.methods.matchPassword =
  async function (enteredPassword) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

// =====================================
// HASH PASSWORD
// =====================================

superAdminSchema.pre(
  "save",
  async function () {

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
  }
);

module.exports =
  mongoose.models.SuperAdmin ||
  mongoose.model(
    "SuperAdmin",
    superAdminSchema
  );

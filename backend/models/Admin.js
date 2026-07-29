const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: "admin",
    },
    failedLoginAttempts: {
    type: Number,
    default: 0
},

accountLockedUntil: {
    type: Date,
    default: null
},

mustChangePassword: {
    type: Boolean,
    default: true
},

passwordChangedAt: {
    type: Date
},

resetPasswordToken: String,

resetPasswordExpires: Date
  },
  {
    timestamps: true,
  }
);

module.exports =
    mongoose.models.Admin ||
    mongoose.model("Admin", adminSchema);
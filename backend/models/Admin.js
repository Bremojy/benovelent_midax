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
    profileImage: {
    type: String,
    default: "",
},

    themeColor: {
      type: String,
      default: "#ff7a00",
      match: /^#[0-9a-fA-F]{6}$/,
    },

createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    default: null,
},

updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    default: null,
},

deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    default: null,
},

deletedAt: {
    type: Date,
    default: null,
},
online: {
    type: Boolean,
    default: false,
},

socketId: {
    type: String,
    default: "",
},
unreadNotifications: {
    type: Number,
    default: 0,
},

unreadMessages: {
    type: Number,
    default: 0,
},
permissions: [{
    type: String,
}],

lastLoginIP: {
    type: String,
    default: "",
},

lastDevice: {
    type: String,
    default: "",
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


adminSchema.index({ email: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ lastLogin: -1 });
adminSchema.set("toJSON", {
    transform(doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.failedLoginAttempts;
        delete ret.__v;
        return ret;
    },
});

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
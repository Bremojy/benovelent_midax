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

    unreadNotifications: {
    type: Number,
    default: 0,
},

socketId: {
    type: String,
    default: "",
},
coverImage: {
    type: String,
    default: "",
},

verified: {
    type: Boolean,
    default: false,
},
lastLogin: {
    type: Date,
},

isDeleted: {
    type: Boolean,
    default: false,
},

    online: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
memberSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

module.exports = mongoose.model("Member", memberSchema);
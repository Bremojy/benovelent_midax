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
profileImage:{
type:String,
default:"",
},

themeColor:{
type:String,
default:"#ff7a00",
match:/^#[0-9a-fA-F]{6}$/,
},
online:{
type:Boolean,
default:false,
},

socketId:{
type:String,
default:"",
},
unreadNotifications:{
type:Number,
default:0,
},

unreadMessages:{
type:Number,
default:0,
},
lastLoginIP:{
type:String,
default:"",
},

lastDevice:{
type:String,
default:"",
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

      sessionVersion: {
        type: Number,
        default: 0,
      },

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
superAdminSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.failedLoginAttempts;
    delete ret.__v;
    return ret;
  },
});

superAdminSchema.index({ status: 1 });
superAdminSchema.index({ lastLogin: -1 });

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

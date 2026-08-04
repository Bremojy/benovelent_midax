const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const calculateProfileCompletion = require("../utils/calculateProfileCompletion");

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

    email:{
type:String,
trim:true,
lowercase:true,
unique:true,
sparse:true,
index:true,
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
    deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "SuperAdmin",
  default: null,
},

    notes: {
      type: String,
      trim: true,
    },

    // =====================================
// PERSONAL INFORMATION
// =====================================

nationalId: {
  type: String,
  trim: true,
  unique:true,

sparse:true,
},

gender: {
  type: String,
  enum: ["Male", "Female", "Other"],
},

dateOfBirth: {
  type: Date,
},

maritalStatus: {
  type: String,
  enum: ["Single", "Married", "Divorced", "Widowed"],
},

passportPhoto: {
  type: String,
  default: "",
},

// =====================================
// ADDRESS INFORMATION
// =====================================

county: {
  type: String,
  trim: true,
},

subCounty: {
  type: String,
  trim: true,
},

ward: {
  type: String,
  trim: true,
},

village: {
  type: String,
  trim: true,
},

postalAddress: {
  type: String,
  trim: true,
},

physicalAddress: {
  type: String,
  trim: true,
},

siteStation: {
  type: String,
  enum: ["Chokaa", "Saika", "Ruaraka", "Garden City", "Garden Estate", "Jacaranda", "Depot", "None of above"],
  default: "",
},

customSiteStation: {
  type: String,
  trim: true,
  default: "",
},

// =====================================
// EMPLOYMENT
// =====================================

occupation: {
  type: String,
  trim: true,
},

employer: {
  type: String,
  trim: true,
},

monthlyIncome: {
  type: Number,
  default: 0,
},

// =====================================
// NEXT OF KIN
// =====================================

nextOfKin: {
  fullName: {
    type: String,
    trim: true,
  },

  relationship: {
    type: String,
    trim: true,
  },

  phone: {
    type: String,
    trim: true,
    unique:true,
index:true,
  },

  nationalId: {
    type: String,
    trim: true,
  },
},

// =====================================
// PAYMENT DETAILS
// =====================================

mpesaNumber: {
  type: String,
  trim: true,
},

bankName: {
  type: String,
  trim: true,
},

bankBranch: {
  type: String,
  trim: true,
},

accountNumber: {
  type: String,
  trim: true,
},

// =====================================
// DOCUMENTS
// =====================================

documents: {
  nationalIdFront: {
    type: String,
    default: "",
  },

  nationalIdBack: {
    type: String,
    default: "",
  },

  passportPhoto: {
    type: String,
    default: "",
  },

  signature: {
    type: String,
    default: "",
  },
},

// =====================================
// MEMBER AGREEMENTS
// =====================================

acceptedConstitution: {
  type: Boolean,
  default: false,
},

acceptedPrivacyPolicy: {
  type: Boolean,
  default: false,
},

acceptedDeclaration: {
  type: Boolean,
  default: false,
},

// =====================================
// PROFILE STATUS
// =====================================

profileCompletion: {
  type: Number,
  default: 0,
  min: 0,
  max: 100,
},

profileCompleted: {
  type: Boolean,
  default: false,
},

profileVerified: {
  type: Boolean,
  default: false,
},

// =====================================
// MEMBERSHIP DETAILS
// =====================================

membershipType: {
  type: String,
  enum: ["Regular", "Honorary"],
  default: "Regular",
},

registrationFeePaid: {
  type: Boolean,
  default: false,
},

// =====================================
// EMERGENCY CONTACT
// =====================================

emergencyContact: {
  fullName: {
    type: String,
    trim: true,
  },

  relationship: {
    type: String,
    trim: true,
  },

  phone: {
    type: String,
    trim: true,
  },
},

deletedAt: {
  type: Date,
  default: null,
},

createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  default: null,
},

updatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  default: null,
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

    themeColor: {
      type: String,
      default: "#ff7a00",
      match: /^#[0-9a-fA-F]{6}$/,
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

memberSchema.pre("save", async function () {

  // =====================================
  // PASSWORD HASHING
  // =====================================

  if (this.isModified("password")) {

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );
  }

  // =====================================
  // PROFILE COMPLETION
  // =====================================

  this.calculateProfileCompletion();
});

// =====================================
// INDEXES
// =====================================

memberSchema.index({ email: 1 });
memberSchema.index({ username: 1 });
memberSchema.index({ memberNumber: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ online: 1 });

memberSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.failedLoginAttempts;
    delete ret.__v;
    return ret;
  },
});

// =====================================

// =====================================
// PROFILE COMPLETION
// =====================================

memberSchema.methods.calculateProfileCompletion = function () {
  const completion = calculateProfileCompletion(this);

  this.profileCompletion = completion.percentage;
  this.profileCompleted = completion.percentage === 100;

  return this.profileCompletion;
};

module.exports =
  mongoose.models.Member ||
  mongoose.model("Member", memberSchema);

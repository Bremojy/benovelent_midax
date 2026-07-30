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
// PERSONAL INFORMATION
// =====================================

nationalId: {
  type: String,
  trim: true,
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

memberSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    
    salt
  );

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

// =====================================

// =====================================
// PROFILE COMPLETION
// =====================================

memberSchema.methods.calculateProfileCompletion = function () {

  let completed = 0;

  const total = 20;

  if (this.fullName) completed++;
  if (this.phone) completed++;
  if (this.email) completed++;
  if (this.memberNumber) completed++;
  if (this.nationalId) completed++;
  if (this.gender) completed++;
  if (this.dateOfBirth) completed++;
  if (this.maritalStatus) completed++;
  if (this.county) completed++;
  if (this.subCounty) completed++;
  if (this.ward) completed++;
  if (this.village) completed++;
  if (this.occupation) completed++;
  if (this.nextOfKin?.fullName) completed++;
  if (this.mpesaNumber || this.accountNumber) completed++;
  if (this.documents?.nationalIdFront) completed++;
  if (this.documents?.nationalIdBack) completed++;
  if (this.documents?.passportPhoto) completed++;
  if (this.acceptedConstitution) completed++;
  if (this.acceptedDeclaration) completed++;

  this.profileCompletion = Math.round(
    (completed / total) * 100
  );

  this.profileCompleted =
    this.profileCompletion === 100;

  return this.profileCompletion;
};

module.exports =
  mongoose.models.Member ||
  mongoose.model("Member", memberSchema);
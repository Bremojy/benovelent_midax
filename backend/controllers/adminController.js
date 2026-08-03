const bcrypt = require("bcryptjs");
const Member = require("../models/Member");

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      onlineMembers,
      verifiedMembers,
    ] = await Promise.all([
      Member.countDocuments({ isDeleted: false }),
      Member.countDocuments({ status: "active", isDeleted: false }),
      Member.countDocuments({ status: "inactive", isDeleted: false }),
      Member.countDocuments({ status: "suspended", isDeleted: false }),
      Member.countDocuments({ online: true, isDeleted: false }),
      Member.countDocuments({ verified: true, isDeleted: false }),
    ]);

    res.json({
      success: true,
      dashboard: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        onlineMembers,
        verifiedMembers,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================================
   GET COLLEAGUES
===================================================== */

exports.getColleagues = async (req, res) => {
  try {
    const Admin = require("../models/Admin");
    const colleagues = await Admin.find({ status: { $ne: "deleted" } })
      .select("-password -resetPasswordToken -resetPasswordExpires -failedLoginAttempts")
      .sort({ lastLogin: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: colleagues.length,
      colleagues,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   GET ALL MEMBERS
===================================================== */

exports.getMembers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = {
      isDeleted: false,
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { memberNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    const total = await Member.countDocuments(query);

    const members = await Member.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: members.length,
      members,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET SINGLE MEMBER
===================================================== */

exports.getMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).select("-password");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    res.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================================
   CREATE MEMBER
===================================================== */

exports.createMember = async (req, res) => {
  try {
    const {
      memberNumber,
      fullName,
      username,
      phone,
      email,
      department,
      position,
      monthlyContribution,
    } = req.body;

    // ==========================================
    // CLEAN INPUT
    // ==========================================

    const cleanMemberNumber =
      String(memberNumber || "").trim();

    const cleanFullName =
      String(fullName || "").trim();

    const cleanUsername =
      String(username || "").trim();

    const cleanPhone =
      String(phone || "").trim();

    const cleanEmail =
      String(email || "").trim().toLowerCase();

    const cleanDepartment =
      String(department || "").trim();

    const cleanPosition =
      String(position || "").trim();

    const contribution =
      Number(monthlyContribution) || 0;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !cleanMemberNumber ||
      !cleanFullName ||
      !cleanPhone ||
      !cleanEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Member Number, Full Name, Phone and Email are required for portal access.",
      });
    }

    // ==========================================
    // CHECK MEMBER NUMBER
    // ==========================================

    const existingMemberNumber =
      await Member.findOne({
        memberNumber: cleanMemberNumber,
      });

    if (existingMemberNumber) {
      return res.status(400).json({
        success: false,
        message:
          "A member with this member number already exists.",
      });
    }

    // ==========================================
    // CHECK EMAIL ONLY IF PROVIDED
    // ==========================================

    if (cleanEmail) {
      const existingEmail =
        await Member.findOne({
          email: cleanEmail,
        });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message:
            "A member with this email already exists.",
        });
      }
    }

    // ==========================================
    // CHECK USERNAME ONLY IF PROVIDED
    // ==========================================

    if (cleanUsername) {
      const existingUsername =
        await Member.findOne({
          username: cleanUsername,
        });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message:
            "A member with this username already exists.",
        });
      }
    }

    // ==========================================
    // TEMPORARY PASSWORD
    // ==========================================

    const temporaryPassword =
      `MIDAX@${Math.floor(100000 + Math.random() * 900000)}`;

    // Member schema hashes plaintext passwords in its pre-save hook.

    // ==========================================
    // MEMBER DATA
    // ==========================================

    const memberData = {
      memberNumber:
        cleanMemberNumber,

      fullName:
        cleanFullName,

      phone:
        cleanPhone,

      department:
        cleanDepartment,

      position:
        cleanPosition,

      monthlyContribution:
        contribution,

      password:
        temporaryPassword,

      role:
        "member",

      status:
        "active",

      verified:
        false,

      online:
        false,

      isDeleted:
        false,

      mustChangePassword:
        true,
    };

    // ==========================================
    // OPTIONAL FIELDS
    // ==========================================

    if (cleanUsername) {
      memberData.username =
        cleanUsername;
    }

    if (cleanEmail) {
      memberData.email =
        cleanEmail;
    }

    if (req.files?.profileImage?.[0]) {
      memberData.profileImage = `/uploads/${req.uploadType || "member-documents"}/${req.files.profileImage[0].filename}`;
    }
    if (req.files?.passportPhoto?.[0]) {
      memberData.passportPhoto = `/uploads/${req.uploadType || "member-documents"}/${req.files.passportPhoto[0].filename}`;
    }
    if (req.files?.nationalIdFront?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.nationalIdFront = `/uploads/${req.uploadType || "member-documents"}/${req.files.nationalIdFront[0].filename}`;
    }
    if (req.files?.nationalIdBack?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.nationalIdBack = `/uploads/${req.uploadType || "member-documents"}/${req.files.nationalIdBack[0].filename}`;
    }
    if (req.files?.signature?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.signature = `/uploads/${req.uploadType || "member-documents"}/${req.files.signature[0].filename}`;
    }

    // ==========================================
    // CREATE MEMBER
    // ==========================================

    const member =
      await Member.create(
        memberData
      );

    // ==========================================
    // REMOVE PASSWORD FROM RESPONSE
    // ==========================================

    const memberResponse =
      member.toObject();

    delete memberResponse.password;

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "Member account created successfully.",

      temporaryPassword,

      member:
        memberResponse,
    });

  } catch (error) {

    console.error(
      "CREATE MEMBER ERROR:",
      error
    );

    // ==========================================
    // MONGOOSE DUPLICATE KEY
    // ==========================================

    if (error.code === 11000) {

      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      let message =
        "A member with these details already exists.";

      if (
        duplicateField ===
        "memberNumber"
      ) {
        message =
          "A member with this member number already exists.";
      }

      if (
        duplicateField ===
        "email"
      ) {
        message =
          "A member with this email already exists.";
      }

      if (
        duplicateField ===
        "username"
      ) {
        message =
          "A member with this username already exists.";
      }

      return res.status(400).json({
        success: false,
        message,
      });
    }

    // ==========================================
    // GENERAL ERROR
    // ==========================================

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to create member account.",
    });
  }
};



/* =====================================================
   UPDATE MEMBER
===================================================== */

exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Prevent duplicate email
    if (
      req.body.email &&
      req.body.email !== member.email
    ) {
      const existingEmail = await Member.findOne({
        email: req.body.email,
        _id: { $ne: member._id },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists.",
        });
      }
    }

    // Prevent duplicate username
    if (
      req.body.username &&
      req.body.username !== member.username
    ) {
      const existingUsername = await Member.findOne({
        username: req.body.username,
        _id: { $ne: member._id },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists.",
        });
      }
    }

    member.fullName =
      req.body.fullName ?? member.fullName;

    member.username =
      req.body.username ?? member.username;

    member.phone =
      req.body.phone ?? member.phone;

    member.email =
      req.body.email ?? member.email;

    member.department =
      req.body.department ?? member.department;

    member.position =
      req.body.position ?? member.position;

    member.monthlyContribution =
      req.body.monthlyContribution ??
      member.monthlyContribution;

    member.status =
      req.body.status ?? member.status;

    member.notes =
      req.body.notes ?? member.notes;

    await member.save();

    res.json({
      success: true,
      message: "Member updated successfully.",
      member,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


/* =====================================================
   SUSPEND MEMBER
===================================================== */

exports.suspendMember = async (req, res) => {

  try {

    const member = await Member.findById(req.params.id);

    if (!member) {

      return res.status(404).json({
        success:false,
        message:"Member not found."
      });

    }

    member.status = "suspended";
    member.online = false;

    await member.save();

    res.json({

      success:true,

      message:"Member suspended successfully.",

      member

    });

  } catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   ACTIVATE MEMBER
===================================================== */

exports.activateMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.status="active";

    await member.save();

    res.json({

      success:true,

      message:"Member activated successfully.",

      member

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   SOFT DELETE MEMBER
===================================================== */

exports.deleteMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.isDeleted = true;

    member.online = false;

    await member.save();

    res.json({

      success:true,

      message:"Member deleted successfully."

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RESTORE MEMBER
===================================================== */

exports.restoreMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.isDeleted = false;

    member.status = "active";

    await member.save();

    res.json({

      success:true,

      message:"Member restored successfully.",

      member

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RESET MEMBER PASSWORD
===================================================== */

exports.resetPassword = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    const temporaryPassword = `MIDAX@${Math.floor(100000 + Math.random() * 900000)}`;

    // Member schema hashes the plaintext password on save.
    member.password = temporaryPassword;

    member.mustChangePassword = true;

    await member.save();

    res.json({

      success:true,

      message:"Password reset successfully.",

      temporaryPassword

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RECENT MEMBERS
===================================================== */

exports.getRecentMembers = async (req, res) => {
  try {

    const members = await Member.find({
      isDeleted: false
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      count: members.length,
      members,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================================
   MEMBER STATISTICS
===================================================== */

exports.getStatistics = async (req, res) => {

  try {

    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      onlineMembers,
      verifiedMembers,
      deletedMembers,
    ] = await Promise.all([

      Member.countDocuments({ isDeleted: false }),

      Member.countDocuments({
        status: "active",
        isDeleted: false,
      }),

      Member.countDocuments({
        status: "inactive",
        isDeleted: false,
      }),

      Member.countDocuments({
        status: "suspended",
        isDeleted: false,
      }),

      Member.countDocuments({
        online: true,
        isDeleted: false,
      }),

      Member.countDocuments({
        verified: true,
        isDeleted: false,
      }),

      Member.countDocuments({
        isDeleted: true,
      }),

    ]);

    res.json({

      success: true,

      statistics: {

        totalMembers,

        activeMembers,

        inactiveMembers,

        suspendedMembers,

        onlineMembers,

        verifiedMembers,

        deletedMembers,

      },

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================================
   FILTER MEMBERS
===================================================== */

exports.filterMembers = async (req, res) => {

  try {

    const {

      status,

      department,

      verified,

      online,

    } = req.query;

    const query = {
      isDeleted: false,
    };

    if (status) query.status = status;

    if (department) query.department = department;

    if (verified !== undefined)
      query.verified = verified === "true";

    if (online !== undefined)
      query.online = online === "true";

    const members = await Member.find(query)
      .select("-password")
      .sort({ fullName: 1 })
      .lean();

    res.json({

      success: true,

      count: members.length,

      members,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================================
   MONTHLY REGISTRATION REPORT
===================================================== */

exports.monthlyRegistrations = async (req, res) => {

  try {

    const report = await Member.aggregate([

      {
        $match: {
          isDeleted: false,
        },
      },

      {
        $group: {

          _id: {

            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

          },

          total: {
            $sum: 1,
          },

        },

      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },

    ]);

    res.json({

      success: true,

      report,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================================
   CONTRIBUTION SUMMARY
===================================================== */

exports.contributionSummary = async (req, res) => {

  try {

    const summary = await Member.aggregate([

      {
        $match: {
          isDeleted: false,
        },
      },

      {
        $group: {

          _id: null,

          totalContribution: {
            $sum: "$monthlyContribution",
          },

          averageContribution: {
            $avg: "$monthlyContribution",
          },

          highestContribution: {
            $max: "$monthlyContribution",
          },

          lowestContribution: {
            $min: "$monthlyContribution",
          },

        },

      },

    ]);

    res.json({

      success: true,

      summary:
        summary[0] || {},

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};



// ======================================================
// ADMIN PROFILE / SECURITY / PREFERENCES
// ======================================================

exports.getProfile = async (req, res) => {
  try {
    const admin = await require("../models/Admin")
      .findById(req.user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires -failedLoginAttempts");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Administrator not found." });
    }

    return res.json({ success: true, profile: admin });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const Admin = require("../models/Admin");
    const admin = await Admin.findById(req.user._id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Administrator not found." });
    }

    if (req.body.fullName !== undefined) admin.fullName = String(req.body.fullName).trim();
    if (req.body.name !== undefined) admin.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) admin.phone = String(req.body.phone).trim();

    if (req.body.email && req.body.email.toLowerCase() !== admin.email) {
      const exists = await Admin.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: admin._id },
      });
      if (exists) {
        return res.status(409).json({ success: false, message: "Email already exists." });
      }
      admin.email = req.body.email.toLowerCase().trim();
    }

    if (req.file) {
      admin.profileImage = `/uploads/${req.uploadType || "profiles"}/${req.file.filename}`;
    }

    if (req.files?.profileImage?.[0]) {
      admin.profileImage = `/uploads/${req.uploadType || "profiles"}/${req.files.profileImage[0].filename}`;
    }

    await admin.save();

    return res.json({
      success: true,
      message: "Administrator profile updated.",
      profile: admin,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const Admin = require("../models/Admin");
    const admin = await Admin.findById(req.user._id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Administrator not found." });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All password fields are required." });
    }

    if (!(await bcrypt.compare(currentPassword, admin.password))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match." });
    }

    admin.password = newPassword;
    admin.mustChangePassword = false;
    admin.passwordChangedAt = new Date();
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = null;
    await admin.save();

    return res.json({ success: true, message: "Administrator password changed successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const Admin = require("../models/Admin");
    const admin = await Admin.findById(req.user._id).select("themeColor");
    return res.json({
      success: true,
      settings: { themeColor: admin?.themeColor || "#ff7a00" },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const Admin = require("../models/Admin");
    const admin = await Admin.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Administrator not found." });
    }

    const allowed = ["#ff7a00", "#7c3aed", "#0ea5e9", "#10b981", "#e11d48", "#f59e0b"];
    if (req.body.themeColor && allowed.includes(req.body.themeColor)) {
      admin.themeColor = req.body.themeColor;
    }

    await admin.save();

    return res.json({
      success: true,
      message: "Portal preferences saved.",
      settings: { themeColor: admin.themeColor || "#ff7a00" },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

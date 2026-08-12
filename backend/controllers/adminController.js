const bcrypt = require("bcryptjs");
const Member = require("../models/Member");
const { sendEmail, sendSmsNotification } = require("../services/memberBroadcastService");
const calculateProfileCompletion = require("../utils/calculateProfileCompletion");
const Finance = require("../models/Finance");
const FeedbackCollection = require("../models/FeedbackCollection");
const Notification = require("../models/Notification");
const News = require("../models/News");
const SupportRequest = require("../models/SupportRequest");
const EducationSupport = require("../models/EducationSupport");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

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
      completedProfiles,
      incompleteProfiles,
      totalLeaders,
      bookBalance,
      approvedClaims,
      pendingFuneral,
      pendingMedical,
      pendingEducation,
      pendingSupportRequests,
      publishedNews,
      unreadNotifications,
      feedbackCollections,
      feedbackResponses,
    ] = await Promise.all([
      Member.countDocuments({ role: "member", isDeleted: false }),
      Member.countDocuments({ role: "member", status: "active", isDeleted: false }),
      Member.countDocuments({ role: "member", status: "inactive", isDeleted: false }),
      Member.countDocuments({ role: "member", status: "suspended", isDeleted: false }),
      Member.countDocuments({ role: "member", online: true, isDeleted: false }),
      Member.countDocuments({ role: "member", verified: true, isDeleted: false }),
      Member.countDocuments({ role: "member", profileCompleted: true, isDeleted: false }),
      Member.countDocuments({ role: "member", profileCompleted: { $ne: true }, isDeleted: false }),
      require("../models/Admin").countDocuments({ status: { $ne: "deleted" } }),
      Finance.aggregate([{ $match: { status: { $in: ["approved", "completed"] } } }, { $group: { _id: null, total: { $sum: { $cond: [{ $in: ["$type", ["contribution", "income"]] }, "$amount", { $multiply: ["$amount", -1] }] } } } }]),
      Finance.countDocuments({ type: "claim", status: { $in: ["approved", "completed"] } }),
      FuneralSupport.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
      MedicalSupport.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
      EducationSupport.countDocuments({ status: "Pending" }),
      SupportRequest.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
      News.countDocuments({ published: true, status: "published" }),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
      FeedbackCollection.countDocuments({ status: "active" }),
      FeedbackCollection.aggregate([{ $unwind: "$responses" }, { $count: "count" }]),
    ]);

    const incompleteMembers = (await Member.find({ role: "member", isDeleted: false, profileCompleted: { $ne: true } }).select("fullName memberNumber profileCompletion").sort({ profileCompletion: 1, createdAt: -1 }).limit(20).lean()).map((m) => ({ ...m, missingFields: calculateProfileCompletion(m).missingFields }));

    res.json({
      success: true,
      dashboard: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        onlineMembers,
        verifiedMembers,
        completedProfiles,
        incompleteProfiles,
        totalLeaders,
        bookBalance: Number(bookBalance?.[0]?.total || 0),
        approvedClaims,
        pendingSupport: {
          total: Number(pendingFuneral) + Number(pendingMedical) + Number(pendingEducation) + Number(pendingSupportRequests),
          funeral: pendingFuneral,
          medical: pendingMedical,
          education: pendingEducation,
          general: pendingSupportRequests,
        },
        publishedNews,
        unreadNotifications,
        activeFeedbackCollections: feedbackCollections,
        feedbackResponses: Number(feedbackResponses?.[0]?.count || 0),
        incompleteMembers,
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
      role: "member",
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
      .select("-password -monthlyIncome")
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
    }).select("-password -monthlyIncome");

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
      memberData.profileImage = resolveStoredFileUrl(req.files.profileImage[0], `/uploads/${req.uploadType || "member-documents"}`);
    }
    if (req.files?.passportPhoto?.[0]) {
      memberData.passportPhoto = resolveStoredFileUrl(req.files.passportPhoto[0], `/uploads/${req.uploadType || "member-documents"}`);
    }
    if (req.files?.nationalIdFront?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.nationalIdFront = resolveStoredFileUrl(req.files.nationalIdFront[0], `/uploads/${req.uploadType || "member-documents"}`);
    }
    if (req.files?.nationalIdBack?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.nationalIdBack = resolveStoredFileUrl(req.files.nationalIdBack[0], `/uploads/${req.uploadType || "member-documents"}`);
    }
    if (req.files?.signature?.[0]) {
      memberData.documents = memberData.documents || {};
      memberData.documents.signature = resolveStoredFileUrl(req.files.signature[0], `/uploads/${req.uploadType || "member-documents"}`);
    }

    // ==========================================
    // CREATE MEMBER
    // ==========================================

    const member =
      await Member.create(
        memberData
      );

    // ==========================================
    // SEND INVITE CREDENTIALS
    // ==========================================

    const inviteSubject = "Your Benevolent Midax member login credentials";
    const inviteMessage = [
      `Hello ${member.fullName},`,
      "",
      "Your Benevolent Midax member account has been created.",
      `Member Number: ${member.memberNumber}`,
      `Username: ${member.username || member.email || member.phone}`,
      `Temporary Password: ${temporaryPassword}`,
      "",
      "Please sign in and change your password immediately.",
    ].join("\n");

    const inviteHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Your Benevolent Midax member login credentials</h2>
        <p>Hello ${member.fullName},</p>
        <p>Your Benevolent Midax member account has been created.</p>
        <ul>
          <li><strong>Member Number:</strong> ${member.memberNumber}</li>
          <li><strong>Username:</strong> ${member.username || member.email || member.phone}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Please sign in and change your password immediately.</p>
      </div>`;

    const delivery = await Promise.allSettled([
      member.email
        ? sendEmail({ to: member.email, subject: inviteSubject, text: inviteMessage, html: inviteHtml })
        : Promise.resolve({ skipped: true, reason: "no-email" }),
      member.phone
        ? sendSmsNotification({ to: member.phone, message: `MIDAX login: ${member.username || member.email || member.phone}. Temp password: ${temporaryPassword}` })
        : Promise.resolve({ skipped: true, reason: "no-phone" }),
    ]);

    const deliveryResult = {
      email: delivery[0]?.status === "fulfilled" ? delivery[0].value : { sent: false, error: delivery[0]?.reason?.message || "email-failed" },
      sms: delivery[1]?.status === "fulfilled" ? delivery[1].value : { sent: false, error: delivery[1]?.reason?.message || "sms-failed" },
    };

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

      delivery: deliveryResult,

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
    member.nationalId = req.body.nationalId ?? member.nationalId;
    const incomingGender = String(req.body.gender ?? "").trim();
    if (incomingGender) member.gender = incomingGender;
    const incomingMaritalStatus = String(req.body.maritalStatus ?? "").trim();
    if (incomingMaritalStatus) member.maritalStatus = incomingMaritalStatus;
    member.dateOfBirth = req.body.dateOfBirth ?? member.dateOfBirth;
    member.physicalAddress = req.body.physicalAddress ?? member.physicalAddress;

    const incomingSiteStation = String(req.body.siteStation ?? member.siteStation ?? "").trim();
    member.siteStation = incomingSiteStation || "";

    if (member.siteStation !== "None of above") {
      member.customSiteStation = "";
    } else {
      member.customSiteStation = String(req.body.customSiteStation ?? member.customSiteStation ?? "").trim();
    }

    if (req.body.nextOfKin && typeof req.body.nextOfKin === "object") member.nextOfKin = { ...(member.nextOfKin?.toObject?.() || member.nextOfKin || {}), ...req.body.nextOfKin };
    const completion = calculateProfileCompletion(member);
    member.profileCompletion = completion.percentage;
    member.profileCompleted = completion.percentage === 100;

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
      role: "member",
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

      Member.countDocuments({ role: "member", isDeleted: false }),

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
      role: "member",
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
      admin.profileImage = resolveStoredFileUrl(req.file, `/uploads/${req.uploadType || "profiles"}`);
    }

    if (req.files?.profileImage?.[0]) {
      admin.profileImage = resolveStoredFileUrl(req.files.profileImage[0], `/uploads/${req.uploadType || "profiles"}`);
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


exports.openClaimDocument = async (req,res)=>{try{const map={medical:"MedicalSupport",funeral:"FuneralSupport",education:"EducationSupport"};const modelName=map[String(req.params.type).toLowerCase()];if(!modelName)return res.status(400).json({success:false,message:"Invalid claim type."});const Model=require(`../models/${modelName}`);const claim=await Model.findById(req.params.id);if(!claim)return res.status(404).json({success:false,message:"Claim not found."});claim.processedBy=req.user._id;if(Array.isArray(claim.timeline))claim.timeline.push({status:claim.status,remarks:`Document opened by administrator ${req.user.fullName||req.user.email||req.user._id}`,updatedBy:req.user._id,date:new Date()});claim.updatedBy=req.user._id;await claim.save();res.json({success:true,message:"Document access recorded."})}catch(e){res.status(500).json({success:false,message:e.message})}};

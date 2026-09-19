const bcrypt = require("bcryptjs");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const { sanitizeAdminForClient } = require("../utils/clientSanitizer");

const Admin = require("../models/Admin");
const Member = require("../models/Member");
const SuperAdmin = require("../models/SuperAdmin");
const Finance = require("../models/Finance");
const FuneralSupport = require("../models/FuneralSupport");
const MedicalSupport = require("../models/MedicalSupport");
const EducationSupport = require("../models/EducationSupport");
const SupportRequest = require("../models/SupportRequest");
const News = require("../models/News");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const FeedbackCollection = require("../models/FeedbackCollection");
const Carousel = require("../models/Carousel");
const Contribution = require("../models/Contribution");
const createAuditLog = require("../utils/createAuditLog");
const { deleteAdminPermanently } = require("../utils/permanentAccountDeletion");
const generateTemporaryPassword = require("../utils/generateTemporaryPassword");
const mongoose = require("mongoose");
const { getUsers: getLiveUsers } = require("../sockets/onlineUsers");
const { getCurrentBookBalance } = require("../services/financeLedgerService");


// ======================================================
// CREATE ADMIN
// SUPERADMIN ONLY
// ======================================================

exports.createAdmin = async (req, res) => {
  try {
    const {
      fullName,
      name,
      email,
      phone,
      password,
    } = req.body;

    const adminName =
      fullName?.trim() ||
      name?.trim();

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (
      !adminName ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email, phone and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // -----------------------------------------------
    // CHECK EXISTING ADMIN
    // -----------------------------------------------

    const [existingAdmin, existingMember, existingSuperAdmin] = await Promise.all([
      Admin.findOne({ email: normalizedEmail }),
      Member.findOne({ email: normalizedEmail, role: "member", isDeleted: { $ne: true } }),
      SuperAdmin.findOne({ email: normalizedEmail }),
    ]);

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message:
          "An administrator with this email already exists.",
        code: "ADMIN_EXISTS",
      });
    }

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "This email is already used by a member account.",
        code: "EMAIL_USED_BY_MEMBER",
      });
    }

    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: "This email is reserved for a SuperAdmin account.",
        code: "EMAIL_USED_BY_SUPERADMIN",
      });
    }

    // Remove a legacy shadow chat profile only after confirming no live portal
    // account with this email exists. This prevents stale duplicate errors.
    await Member.deleteMany({
      email: normalizedEmail,
      role: "admin",
      notes: { $regex: "^Auto-synced portal chat profile for admin\\.$", $options: "i" },
    });

    // -----------------------------------------------
    // CREATE ADMIN
    // -----------------------------------------------
    //
    // IMPORTANT:
    // Admin.js already hashes passwords
    // using the pre("save") middleware.
    //
    // Therefore we DO NOT hash here.
    //

    const admin = await Admin.create({
      name: adminName,
      fullName: adminName,

      email: normalizedEmail,

      phone: phone.trim(),

      password,

      role: "admin",

      status: "active",

      mustChangePassword: true,
    });

    // -----------------------------------------------
    // REMOVE SENSITIVE DATA
    // -----------------------------------------------

    const adminResponse =
      admin.toObject();

    delete adminResponse.password;

    delete adminResponse.resetPasswordToken;

    delete adminResponse.resetPasswordExpires;

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Administrator created successfully.",

      admin: sanitizeAdminForClient(adminResponse),
    });

  } catch (error) {
    console.error(
      "Create Admin Error:",
      error
    );

    // -----------------------------------------------
    // DUPLICATE EMAIL
    // -----------------------------------------------

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
        code: "DUPLICATE_EMAIL",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create administrator.",
    });
  }
};


// ======================================================
// GET ALL ADMINS
// ======================================================

exports.getAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const currentPage =
      Math.max(Number(page), 1);

    const currentLimit =
      Math.max(Number(limit), 1);

    const skip =
      (currentPage - 1) *
      currentLimit;

    // -----------------------------------------------
    // SEARCH
    // -----------------------------------------------

    const query = {};

    if (search.trim()) {
      const searchRegex =
        new RegExp(
          search.trim(),
          "i"
        );

      query.$or = [
        {
          fullName: searchRegex,
        },
        {
          name: searchRegex,
        },
        {
          email: searchRegex,
        },
        {
          phone: searchRegex,
        },
      ];
    }

    // -----------------------------------------------
    // FETCH
    // -----------------------------------------------

    const [
      admins,
      total,
    ] = await Promise.all([
      Admin.find(query)
        .select(
          "-password -resetPasswordToken -resetPasswordExpires"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(currentLimit),

      Admin.countDocuments(query),
    ]);

    const totalPages =
      Math.max(
        Math.ceil(
          total / currentLimit
        ),
        1
      );

    return res.json({
      success: true,

      admins,

      total,

      page: currentPage,

      limit: currentLimit,

      totalPages,
    });

  } catch (error) {
    console.error(
      "Get Admins Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load administrators.",
    });
  }
};


// ======================================================
// GET SINGLE ADMIN
// ======================================================

exports.getAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin =
      await Admin.findById(id).select(
        "-password -resetPasswordToken -resetPasswordExpires"
      );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    return res.json({
      success: true,
      admin,
    });

  } catch (error) {
    console.error(
      "Get Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load administrator.",
    });
  }
};


// ======================================================
// UPDATE ADMIN
// ======================================================

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fullName,
      name,
      email,
      phone,
      status,
    } = req.body;

    const admin =
      await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    // -----------------------------------------------
    // UPDATE NAME
    // -----------------------------------------------

    if (fullName?.trim()) {
      admin.fullName =
        fullName.trim();

      admin.name =
        fullName.trim();
    } else if (name?.trim()) {
      admin.name =
        name.trim();

      admin.fullName =
        name.trim();
    }

    // -----------------------------------------------
    // UPDATE EMAIL
    // -----------------------------------------------

    if (email?.trim()) {
      const normalizedEmail =
        email.trim().toLowerCase();

      const existing =
        await Admin.findOne({
          email: normalizedEmail,
          _id: {
            $ne: id,
          },
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "Another administrator already uses this email.",
        });
      }

      admin.email =
        normalizedEmail;
    }

    // -----------------------------------------------
    // UPDATE PHONE
    // -----------------------------------------------

    if (phone !== undefined) {
      admin.phone =
        phone.trim();
    }

    // -----------------------------------------------
    // UPDATE STATUS
    // -----------------------------------------------

    if (
      ["active", "inactive", "suspended"]
        .includes(status)
    ) {
      admin.status = status;
    }

    await admin.save();

    const response =
      admin.toObject();

    delete response.password;

    delete response.resetPasswordToken;

    delete response.resetPasswordExpires;

    return res.json({
      success: true,

      message:
        "Administrator updated successfully.",

      admin: sanitizeAdminForClient(response),
    });

  } catch (error) {
    console.error(
      "Update Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update administrator.",
    });
  }
};


// ======================================================
// SUSPEND ADMIN
// ======================================================

exports.suspendAdmin = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const admin =
      await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    admin.status =
      "suspended";

    await admin.save();

    return res.json({
      success: true,

      message:
        "Administrator suspended successfully.",
    });

  } catch (error) {
    console.error(
      "Suspend Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to suspend administrator.",
    });
  }
};


// ======================================================
// ACTIVATE ADMIN
// ======================================================

exports.activateAdmin = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const admin =
      await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    admin.status =
      "active";

    await admin.save();

    return res.json({
      success: true,

      message:
        "Administrator activated successfully.",
    });

  } catch (error) {
    console.error(
      "Activate Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to activate administrator.",
    });
  }
};


// ======================================================
// RESET ADMIN PASSWORD
// ======================================================

exports.resetAdminPassword =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const admin =
        await Admin.findById(id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message:
            "Administrator not found.",
        });
      }

      // ---------------------------------------------
      // GENERATE TEMPORARY PASSWORD
      // ---------------------------------------------

      const temporaryPassword = generateTemporaryPassword();

      admin.password =
        temporaryPassword;

      admin.mustChangePassword =
        true;

      admin.passwordChangedAt =
        null;

      admin.resetPasswordToken =
        null;

      admin.resetPasswordExpires =
        null;

      await admin.save();

      return res.json({
        success: true,

        message:
          "Administrator password reset successfully.",

        temporaryPassword,
      });

    } catch (error) {
      console.error(
        "Reset Admin Password Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reset administrator password.",
      });
    }
  };


// ======================================================
// DELETE ADMIN
// ======================================================

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteAdminPermanently(id, req.user._id);

    await createAuditLog({
      user: req.user._id,
      userRole: "superadmin",
      action: "DELETE_PERMANENTLY",
      module: "Administrator",
      description: `Permanently deleted administrator ${result.admin.fullName || result.admin.name || result.admin.email || id}.`,
      metadata: {
        deletedAdminId: String(result.admin._id),
        summary: result.summary,
      },
      req,
    });

    return res.json({
      success: true,
      permanent: true,
      message: "Administrator was permanently deleted. Reusing the same credentials is now allowed.",
      summary: result.summary,
    });
  } catch (error) {
    console.error("Permanent admin deletion error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to permanently delete administrator.",
    });
  }
};

// ======================================================
// ADMIN STATISTICS
// ======================================================

exports.getAdminStatistics =
  async (req, res) => {
    try {
      const [
        total,
        active,
        inactive,
        suspended,
      ] = await Promise.all([
        Admin.countDocuments(),

        Admin.countDocuments({
          status: "active",
        }),

        Admin.countDocuments({
          status: "inactive",
        }),

        Admin.countDocuments({
          status: "suspended",
        }),
      ]);

      return res.json({
        success: true,

        statistics: {
          total,
          active,
          inactive,
          suspended,
        },
      });

    } catch (error) {
      console.error(
        "Admin Statistics Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load administrator statistics.",
      });
    }
  };

// ======================================================
// SUPERADMIN PROFILE / SECURITY / PREFERENCES
// ======================================================

exports.getProfile = async (req, res) => {
  try {
    const SuperAdmin = require("../models/SuperAdmin");
    const profile = await SuperAdmin.findById(req.user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires -failedLoginAttempts");

    if (!profile) {
      return res.status(404).json({ success: false, message: "Super administrator not found." });
    }

    return res.json({ success: true, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const SuperAdmin = require("../models/SuperAdmin");
    const profile = await SuperAdmin.findById(req.user._id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Super administrator not found." });
    }

    if (req.body.name !== undefined) profile.name = String(req.body.name).trim();
    if (req.body.email && req.body.email.toLowerCase() !== profile.email) {
      const exists = await SuperAdmin.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: profile._id },
      });
      if (exists) {
        return res.status(409).json({ success: false, message: "Email already exists." });
      }
      profile.email = req.body.email.toLowerCase().trim();
    }

    if (req.files?.profileImage?.[0]) {
      profile.profileImage = resolveStoredFileUrl(req.files.profileImage[0], `/uploads/${req.uploadType || "profiles"}`);
    }

    await profile.save();

    return res.json({
      success: true,
      message: "Super administrator profile updated.",
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const SuperAdmin = require("../models/SuperAdmin");
    const profile = await SuperAdmin.findById(req.user._id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Super administrator not found." });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All password fields are required." });
    }

    if (!(await bcrypt.compare(currentPassword, profile.password))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match." });
    }

    profile.password = newPassword;
    profile.mustChangePassword = false;
    profile.passwordChangedAt = new Date();
    profile.failedLoginAttempts = 0;
    profile.accountLockedUntil = null;

    await profile.save();

    return res.json({ success: true, message: "Super administrator password changed successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const { getSystemSettings, toPublicConfig } = require("../services/systemSettings");
    const settings = await getSystemSettings();
    if (!settings) return res.status(503).json({ success: false, message: "System settings are not configured." });
    return res.json({ success: true, settings: toPublicConfig(settings), raw: settings });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const SystemSettings = require("../models/SystemSettings");
    const { invalidateSystemSettings, toPublicConfig, getSystemSettings } = require("../services/systemSettings");
    const body = req.body || {};
    const current = await SystemSettings.findOne({ singletonKey: "primary" });
    if (!current) return res.status(503).json({ success: false, message: "System settings are not configured. Run migrations first." });

    const assignString = (path, value, max = 500) => { if (value === undefined) return; const v = String(value ?? "").trim().slice(0, max); path(v); };
    if (body.organization) {
      if (body.organization.legalName !== undefined) current.organizationName = String(body.organization.legalName).trim().slice(0, 160);
      if (body.organization.name !== undefined) current.displayName = String(body.organization.name).trim().slice(0, 160);
      if (body.organization.email !== undefined) current.email = String(body.organization.email).trim().slice(0, 200);
      if (body.organization.phone !== undefined) current.phone = String(body.organization.phone).trim().slice(0, 60);
      if (body.organization.address !== undefined) current.address = String(body.organization.address).trim().slice(0, 300);
      if (body.organization.location !== undefined) current.location = String(body.organization.location).trim().slice(0, 200);
      if (body.organization.officeHours !== undefined) current.officeHours = String(body.organization.officeHours).trim().slice(0, 200);
      if (body.organization.logo !== undefined) current.logo = String(body.organization.logo).trim().slice(0, 500);
      if (body.organization.favicon !== undefined) current.favicon = String(body.organization.favicon).trim().slice(0, 500);
      if (body.organization.socialChannels && typeof body.organization.socialChannels === "object") current.socialChannels = { ...current.socialChannels?.toObject?.(), ...body.organization.socialChannels };
    }
    if (body.website && typeof body.website === "object") current.website = { ...current.website?.toObject?.(), ...body.website, visibility: { ...current.website?.visibility?.toObject?.(), ...(body.website.visibility || {}) } };
    if (body.scheme && typeof body.scheme === "object") {
      const patch = { ...body.scheme };
      for (const key of ["monthlyContribution", "gracePeriodDays", "minimumBookBalance"]) if (patch[key] !== undefined) patch[key] = patch[key] === null || patch[key] === "" ? null : Math.max(0, Number(patch[key]));
      if (patch.maintenanceMode !== undefined) patch.maintenanceMode = Boolean(patch.maintenanceMode);
      current.scheme = { ...current.scheme?.toObject?.(), ...patch };
    }
    if (body.support && typeof body.support === "object") current.support = { ...current.support?.toObject?.(), ...body.support };
    if (body.branding && typeof body.branding === "object") current.branding = { ...current.branding?.toObject?.(), ...body.branding };
    if (body.homepage && typeof body.homepage === "object") current.homepage = { ...current.homepage?.toObject?.(), ...body.homepage };
    if (body.notificationReadiness && typeof body.notificationReadiness === "object") current.notificationReadiness = { ...current.notificationReadiness?.toObject?.(), ...body.notificationReadiness };
    if (body.featureToggles && typeof body.featureToggles === "object") current.featureToggles = body.featureToggles;
    if (body.mpesa && typeof body.mpesa === "object") {
      const patch = { ...body.mpesa };
      delete patch.consumerKey; delete patch.consumerSecret; delete patch.passkey; delete patch.securityCredential; delete patch.jwtSecret; delete patch.cloudinarySecret; delete patch.smtpPassword; delete patch.aiSecret; delete patch.vapidPrivateKey; delete patch.turnCredential;
      if (patch.manualPaybill !== undefined) patch.manualPaybill = String(patch.manualPaybill).replace(/\D/g, "").slice(0, 20);
      if (patch.manualAccountReference !== undefined) patch.manualAccountReference = String(patch.manualAccountReference).trim().slice(0, 120);
      if (patch.displayLabel !== undefined) patch.displayLabel = String(patch.displayLabel).trim().slice(0, 80);
      if (patch.environment !== undefined && !["sandbox", "production", "unknown"].includes(patch.environment)) return res.status(400).json({ success:false, message:"Invalid M-PESA environment." });
      current.mpesa = { ...current.mpesa?.toObject?.(), ...patch };
    }
    current.updatedBy = req.user._id; current.updatedByModel = "SuperAdmin";
    await current.save();
    await invalidateSystemSettings();
    const saved = await getSystemSettings({ refresh: true });
    return res.json({ success: true, message: "System settings saved.", settings: toPublicConfig(saved), updatedAt: saved.updatedAt, updatedBy: req.user._id });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

exports.getSystemStatus = async (_req, res) => {
  try {
    const mongoose = require("mongoose");
const { getUsers: getLiveUsers } = require("../sockets/onlineUsers");
    const { getSystemSettings } = require("../services/systemSettings");
    const [settings, redis] = await Promise.all([getSystemSettings(), require("../services/redisCache").health()]);
    const uploads = require("../config/uploadConfig");
    const mpesaConfigured = Boolean(String(process.env.MPESA_SHORTCODE || "").trim() && String(process.env.MPESA_PASSKEY || "").trim());
    const pushConfigured = Boolean(String(process.env.VAPID_PUBLIC_KEY || "").trim() && String(process.env.VAPID_PRIVATE_KEY || "").trim());
    const assistantConfigured = Boolean(String(process.env.ASSISTANT_PROVIDER_URL || process.env.AI_API_URL || "").trim() && String(process.env.ASSISTANT_PROVIDER_KEY || process.env.AI_API_KEY || "").trim() && String(process.env.ASSISTANT_MODEL || process.env.AI_MODEL || "").trim());
    const realtimeReady = require("../sockets/socket").health();
    const databaseReady = mongoose.connection.readyState === 1;
    const checks = { database: databaseReady, redis: Boolean(redis?.ready || redis?.status === "connected" || redis?.available), uploads: Boolean(uploads), realtime: realtimeReady, mpesa: mpesaConfigured || Boolean(settings?.mpesa?.manualPaymentEnabled), push: pushConfigured, assistant: assistantConfigured };
    const readyCount = Object.values(checks).filter(Boolean).length;
    res.json({ success:true, status: readyCount === Object.keys(checks).length ? "ready" : "partially-ready", checks, checkedAt:new Date().toISOString() });
  } catch (error) { res.status(500).json({ success:false, message:error.message }); }
};


exports.getPortalOverview = async (req, res) => {
  try {
    const [
      members, activeMembers, onlineMembers, admins, activeAdmins, superadmins,
      pendingFuneral, pendingMedical, pendingEducation, pendingGeneral,
      approvedClaims, bookBalance, news, conversations, messages, unreadNotifications,
      activeFeedback, carouselSlides,
      feedbackResponseAgg, contributionPulse,
    ] = await Promise.all([
      Member.countDocuments({ role: "member", isDeleted: false }),
      Member.countDocuments({ role: "member", status: "active", isDeleted: false }),
      Promise.resolve(getLiveUsers().filter((user) => user.role === "member").length),
      Admin.countDocuments({ status: { $ne: "deleted" } }),
      Admin.countDocuments({ status: "active" }),
      SuperAdmin.countDocuments({ status: { $nin: ["inactive", "deleted"] } }),
      FuneralSupport.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
      MedicalSupport.countDocuments({ status: { $in: ["Pending", "Under Review"] }, isDeleted: { $ne: true } }),
      EducationSupport.countDocuments({ status: "Pending" }),
      SupportRequest.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
      Finance.countDocuments({ type: "claim", status: { $in: ["approved", "completed"] } }),
      getCurrentBookBalance(),
      News.countDocuments({ published: true, status: "published" }),
      Conversation.countDocuments({}),
      Message.countDocuments({}),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
      FeedbackCollection.countDocuments({ status: "active" }),
      Carousel.countDocuments({ isActive: true }),
      FeedbackCollection.aggregate([{ $unwind: "$responses" }, { $count: "count" }]),
      Contribution.aggregate([
        { $match: { year: new Date().getFullYear() } },
        { $group: { _id: null, collected: { $sum: "$paidAmount" }, expected: { $sum: "$expectedAmount" }, members: { $addToSet: "$member" } } },
      ]),
    ]);

    return res.json({
      success: true,
      overview: {
        system: { online: true, database: mongoose.connection.readyState === 1, databaseName: mongoose.connection.name || "" },
        members: { total: members, active: activeMembers, online: onlineMembers },
        leadership: { administrators: admins, activeAdministrators: activeAdmins, superadmins },
        support: { pending: Number(pendingFuneral) + Number(pendingMedical) + Number(pendingEducation) + Number(pendingGeneral), funeral: pendingFuneral, medical: pendingMedical, education: pendingEducation, general: pendingGeneral, approvedClaims },
        finance: {
          bookBalance: Number(bookBalance?.balance || 0),
          contributionCollected: Number(contributionPulse?.[0]?.collected || 0),
          contributionExpected: Number(contributionPulse?.[0]?.expected || 0),
          contributionMembersCharged: contributionPulse?.[0]?.members?.length || 0,
        },
        communication: { conversations, messages, unreadNotifications },
        content: { publishedNews: news, activeFeedbackCollections: activeFeedback, feedbackResponses: Number(feedbackResponseAgg?.[0]?.count || 0), activeCarouselSlides: carouselSlides },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("SuperAdmin portal overview error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to load portal overview." });
  }
};

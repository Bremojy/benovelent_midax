const bcrypt = require("bcryptjs");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

const Admin = require("../models/Admin");

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

    const existingAdmin =
      await Admin.findOne({
        email: normalizedEmail,
      });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message:
          "An administrator with this email already exists.",
        code: "ADMIN_EXISTS",
      });
    }

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

      admin: adminResponse,
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

      admin: response,
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

      const temporaryPassword =
        `MIDAX@${Math.floor(
          100000 +
            Math.random() *
              900000
        )}`;

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

exports.deleteAdmin = async (
  req,
  res
) => {
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

    await Admin.findByIdAndDelete(
      id
    );

    return res.json({
      success: true,

      message:
        "Administrator removed successfully.",
    });

  } catch (error) {
    console.error(
      "Delete Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to remove administrator.",
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
    const SuperAdmin = require("../models/SuperAdmin");
    const profile = await SuperAdmin.findById(req.user._id).select("themeColor");
    return res.json({
      success: true,
      settings: { themeColor: profile?.themeColor || "#ff7a00" },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const SuperAdmin = require("../models/SuperAdmin");
    const profile = await SuperAdmin.findById(req.user._id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Super administrator not found." });
    }

    const allowed = ["#ff7a00", "#7c3aed", "#0ea5e9", "#10b981", "#e11d48", "#f59e0b"];
    if (req.body.themeColor && allowed.includes(req.body.themeColor)) {
      profile.themeColor = req.body.themeColor;
    }

    await profile.save();

    return res.json({
      success: true,
      message: "Portal preferences saved.",
      settings: { themeColor: profile.themeColor || "#ff7a00" },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getSystemStatus = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    res.json({ success: true, status: mongoose.connection.readyState === 1 ? "operational" : "database-connection-needed", databaseReady: mongoose.connection.readyState === 1, checkedAt: new Date().toISOString() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

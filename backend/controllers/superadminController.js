const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");

// ==========================================
// CREATE ADMIN
// SUPERADMIN ONLY
// ==========================================

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

    // --------------------------------------
    // VALIDATION
    // --------------------------------------

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

    const normalizedEmail =
      email.trim().toLowerCase();

    // --------------------------------------
    // CHECK EXISTING ADMIN
    // --------------------------------------

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

    // --------------------------------------
    // HASH PASSWORD
    // --------------------------------------

    const hashedPassword =
      await bcrypt.hash(password, 12);

    // --------------------------------------
    // CREATE ADMIN
    // --------------------------------------

    const admin = await Admin.create({
      name: adminName,
      fullName: adminName,

      email: normalizedEmail,

      phone: phone.trim(),

      password: hashedPassword,

      role: "admin",

      status: "active",

      mustChangePassword: true,
    });

    // --------------------------------------
    // REMOVE PASSWORD
    // --------------------------------------

    const adminResponse =
      admin.toObject();

    delete adminResponse.password;

    delete adminResponse.resetPasswordToken;

    delete adminResponse.resetPasswordExpires;

    // --------------------------------------
    // RESPONSE
    // --------------------------------------

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

    // Mongo duplicate key
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
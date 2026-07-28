const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Member = require("../models/Member");

// ===============================
// CREATE JWT TOKEN
// ===============================
const generateToken = (id, role) => {
  return jwt.sign(
    {
      id,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// ===============================
// ADMIN SIGNUP
// ===============================
exports.adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin Signup Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ===============================
// ADMIN LOGIN
// ===============================
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(
      password,
      admin.password
    );

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(
      admin._id,
      admin.role
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ===============================
// MEMBER LOGIN
// ===============================
exports.memberLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const member = await Member.findOne({
      username: username.toLowerCase(),
    });

    if (!member) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const match = await bcrypt.compare(
      password,
      member.password
    );

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    member.online = true;
    member.lastSeen = new Date();
    await member.save();

    const token = generateToken(
      member._id,
      member.role
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: member._id,
        fullName: member.fullName,
        username: member.username,
        memberNumber: member.memberNumber,
        profileImage: member.profileImage,
        role: member.role,
      },
    });
  } catch (error) {
    console.error("Member Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ===============================
// MEMBER LOGOUT
// ===============================
exports.memberLogout = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);

    if (member) {
      member.online = false;
      member.lastSeen = new Date();
      await member.save();
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
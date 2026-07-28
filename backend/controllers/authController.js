const bcrypt = require("bcryptjs");

const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const Member = require("../models/Member");

const generateToken = require("../utils/generateToken");

// ==============================
// LOGIN (Super Admin/Admin/Member)
// ==============================

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        let user = null;

        // Look for user in order
        user = await SuperAdmin.findOne({ email });

        if (!user) {
            user = await Admin.findOne({ email });
        }

        if (!user) {
            user = await Member.findOne({ email });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Account active?
        if (user.status && user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated."
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Update last seen
        user.lastSeen = new Date();

        await user.save();

        // Generate JWT
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",

            token,

            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                profilePhoto: user.profilePhoto,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// ==============================
// GET CURRENT USER
// ==============================

exports.getMe = async (req, res) => {

    try {

        return res.status(200).json({
            success: true,
            user: req.user
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// ==============================
// LOGOUT
// ==============================

exports.logout = async (req, res) => {

    try {

        if (req.user) {

            req.user.lastSeen = new Date();

            await req.user.save();

        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

// CREATE ADMIN
exports.createAdmin = async (req, res) => {
    try {

        const {
            fullName,
            email,
            phone,
            password
        } = req.body;

        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const existing = await Admin.findOne({ email });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Admin already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = await Admin.create({
            fullName,
            email,
            phone,
            password: hashedPassword,
            role: "admin",
            status: "active"
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully.",
            admin
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};
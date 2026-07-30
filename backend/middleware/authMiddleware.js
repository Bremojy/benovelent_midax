const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const Member = require("../models/Member");

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization token missing",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user =
            (await SuperAdmin.findById(decoded.id).select("-password")) ||
            (await Admin.findById(decoded.id).select("-password")) ||
            (await Member.findById(decoded.id).select("-password"));

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        req.user = user;

        next();
    } catch (err) {
        console.error("Authentication Error:", err.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

module.exports = {
    verifyToken,
};
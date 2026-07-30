const Member = require("../models/Member");
const calculateProfileCompletion =
require("../utils/calculateProfileCompletion");

module.exports = async (req, res, next) => {

    try {

        // Admins and Super Admins bypass this middleware
        if (
            req.user.role === "admin" ||
            req.user.role === "superadmin"
        ) {
            return next();
        }

        const member = await Member.findById(req.user._id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found."
            });
        }

        const profile =
            calculateProfileCompletion(member);

        if (profile.percentage < 100) {

            return res.status(403).json({

                success: false,

                profileCompleted: false,

                completion: profile.percentage,

                completedFields: profile.completed,

                totalFields: profile.total,

                message:
                    "Complete your profile before accessing this service."

            });

        }

        next();

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
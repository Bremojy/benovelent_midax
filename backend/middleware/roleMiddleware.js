const authorize = (...roles) => {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }

        if (!roles.includes(req.user.role)) {

            return res.status(403).json({

                success: false,

                message: "Access denied"

            });

        }

        next();

    };

};


// Member
const isMember = authorize("member");

// Admin
const isAdmin = authorize("admin");

// Super Admin
const isSuperAdmin = authorize("superadmin");

module.exports = {

    authorize,

    isMember,

    isAdmin,

    isSuperAdmin

};
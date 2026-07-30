module.exports = (req, res, next) => {

    try {

        if (
            req.user.role === "admin" ||
            req.user.role === "superadmin"
        ) {
            return next();
        }

        if (!req.user.verified) {

            return res.status(403).json({

                success: false,

                message:
                    "Your membership has not yet been verified by the administrator.",

                code: "MEMBER_NOT_VERIFIED"

            });

        }

        next();

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
module.exports = (field = "member") => {

    return (req, res, next) => {

        try {

            // Admins can access everything
            if (
                req.user.role === "admin" ||
                req.user.role === "superadmin"
            ) {
                return next();
            }

            const owner =
                req.resource?.[field];

            if (!owner) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Ownership middleware misconfigured."

                });

            }

            if (
                owner.toString() !==
                req.user._id.toString()
            ) {

                return res.status(403).json({

                    success: false,

                    message: "Access denied."

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

};
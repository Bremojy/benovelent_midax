module.exports = (req, res, next) => {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }

        if (

            req.user.role !== "admin" &&

            req.user.role !== "superadmin"

        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Administrator access required.",

                code: "ADMIN_ONLY"

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
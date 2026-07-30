module.exports = (req, res, next) => {

    try {

        if (

            req.user.role === "admin" ||

            req.user.role === "superadmin"

        ) {

            return next();

        }

        switch (req.user.status) {

            case "active":

                return next();

            case "inactive":

                return res.status(403).json({

                    success: false,

                    message:
                        "Your membership is inactive. Please contact the office.",

                    code: "MEMBER_INACTIVE"

                });

            case "suspended":

                return res.status(403).json({

                    success: false,

                    message:
                        "Your membership has been suspended.",

                    code: "MEMBER_SUSPENDED"

                });

            default:

                return res.status(403).json({

                    success: false,

                    message:
                        "Membership status is invalid."

                });

        }

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
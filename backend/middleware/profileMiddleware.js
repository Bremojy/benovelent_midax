const calculateProfileCompletion =
require("../utils/calculateProfileCompletion");

const Member =
require("../models/Member");

module.exports = async (req, res, next) => {

    try {

        const member =
        await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        const profile =
        calculateProfileCompletion(member);

        if (profile.percentage < 100) {

            return res.status(403).json({

                success:false,

                message:
                "Complete your profile before accessing this feature.",

                profileCompletion:
                profile.percentage,

                missingFields:
                profile.missingFields

            });

        }

        next();

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};
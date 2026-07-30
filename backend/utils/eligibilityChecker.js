const Member = require("../models/Member");

const calculateProfileCompletion =
require("./calculateProfileCompletion");

module.exports = async (memberId) => {

    const member =
        await Member.findById(memberId);

    if (!member) {

        return {

            eligible:false,

            reason:"Member not found."

        };

    }

    const profile =
        calculateProfileCompletion(member);

    if(member.status!=="active"){

        return{

            eligible:false,

            reason:"Membership is not active."

        };

    }

    if(!member.verified){

        return{

            eligible:false,

            reason:"Membership has not been verified."

        };

    }

    if(profile.percentage<100){

        return{

            eligible:false,

            reason:
            "Profile is not 100% complete.",

            completion:
            profile.percentage

        };

    }

    return{

        eligible:true,

        completion:
        profile.percentage,

        member

    };

};
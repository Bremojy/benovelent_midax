const bcrypt = require("bcryptjs");

const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const News = require("../models/News");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Dependent = require("../models/Dependent");

const calculateProfileCompletion =
require("../utils/calculateProfileCompletion");

const createAuditLog =
require("../utils/createAuditLog");
exports.getDashboard = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id)
            .select("-password")
            .lean();

        if (!member) {

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        // ==========================================
        // PROFILE COMPLETION
        // ==========================================

        const profile =
            calculateProfileCompletion(member);

        // ==========================================
        // CONTRIBUTIONS
        // ==========================================

        const contributions =
            await Contribution.find({

                member:member._id

            })
            .sort({

                year:-1,

                month:-1

            });

        const totalContributions =
            contributions.reduce(

                (sum,item)=>

                    sum + (item.paidAmount || 0),

                0

            );

        // ==========================================
        // DEPENDENTS
        // ==========================================

        const totalDependents =
            await Dependent.countDocuments({

                member:member._id,

                active:true

            });

        const verifiedDependents =
            await Dependent.countDocuments({

                member:member._id,

                active:true,

                verified:true

            });

        // ==========================================
        // NEWS
        // ==========================================

        const announcements =
            await News.find({

                published:true,

                status:"published"

            })
            .sort({

                publishDate:-1

            })
            .limit(5);

        // ==========================================
        // MESSAGES
        // ==========================================

        const unreadMessages =
            await Message.countDocuments({

                deletedForEveryone:false,

                sender:{
                    $ne:member._id
                },

                seenBy:{
                    $ne:member._id
                }

            });

        // ==========================================
        // NOTIFICATIONS
        // ==========================================

        const unreadNotifications =
            await Notification.countDocuments({

                recipient:member._id,

                read:false

            });

        // ==========================================
        // BENEFIT ELIGIBILITY
        // ==========================================

        const eligible =
            profile.percentage === 100 &&
            member.status === "active" &&
            member.verified;

        // ==========================================
        // AUDIT LOG
        // ==========================================

        await createAuditLog({

            user:member._id,

            userRole:"member",

            action:"VIEW",

            module:"Dashboard",

            description:"Member opened dashboard",

            req

        });

        // ==========================================
        // RESPONSE
        // ==========================================

        res.json({

            success:true,

            dashboard:{

                member,

                profileCompletion:profile,

                statistics:{

                    totalContributions,

                    monthlyContribution:
                        member.monthlyContribution,

                    totalDependents,

                    verifiedDependents,

                    unreadMessages,

                    unreadNotifications,

                    membershipStatus:
                        member.status,

                    verified:
                        member.verified,

                    online:
                        member.online

                },

                benefits:{

                    educationSupport:eligible,

                    medicalSupport:eligible,

                    funeralSupport:eligible,

                    voting:eligible,

                    messaging:true

                },

                announcements,

                recentContributions:
                    contributions.slice(0,5)

            }

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};


/* ==========================================
   GET PROFILE
========================================== */

exports.getProfile = async (req, res) => {

    try {

        const member = await Member.findById(req.user._id)
            .select("-password")
            .lean();

        if (!member) {

            return res.status(404).json({
                success: false,
                message: "Member not found."
            });

        }

        const profile =
            calculateProfileCompletion(member);

        const dependents =
            await Dependent.find({
                member: member._id,
                active: true
            });

        res.json({

            success: true,

            member,

            profileCompletion: profile,

            dependents,

            canAccessPortal:
                profile.percentage === 100 &&
                member.status === "active" &&
                member.verified

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/* ==========================================
   UPDATE PROFILE
========================================== */

exports.updateProfile = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({

                success: false,

                message: "Member not found."

            });

        }

        // Prevent duplicate email
        if (
            req.body.email &&
            req.body.email !== member.email
        ) {

            const existing =
                await Member.findOne({

                    email: req.body.email,

                    _id: {
                        $ne: member._id
                    }

                });

            if (existing) {

                return res.status(400).json({

                    success: false,

                    message: "Email already exists."

                });

            }

        }

        // Prevent duplicate phone
        if (
            req.body.phone &&
            req.body.phone !== member.phone
        ) {

            const existingPhone =
                await Member.findOne({

                    phone: req.body.phone,

                    _id: {
                        $ne: member._id
                    }

                });

            if (existingPhone) {

                return res.status(400).json({

                    success: false,

                    message: "Phone number already exists."

                });

            }

        }

        // Update only supplied fields
        // ==========================================
// ALLOWED MEMBER PROFILE FIELDS
// ==========================================

const allowedFields = [
    "fullName",
    "username",
    "email",
    "phone",
    "bio",

    // Personal
    "nationalId",
    "gender",
    "dateOfBirth",
    "maritalStatus",

    // Address
    "county",
    "subCounty",
    "ward",
    "village",
    "postalAddress",

    // Employment
    "occupation",
    "employer",
    "monthlyIncome",

    // Next of kin
    "nextOfKin",

    // Payment
    "mpesaNumber",
    "bankName",
    "bankBranch",
    "accountNumber",

    // Emergency
    "emergencyContact",
];

allowedFields.forEach((field) => {

    if (
        req.body[field] !== undefined
    ) {
        member[field] =
            req.body[field];
    }

});

        member.lastSeen = new Date();

        await member.save();

        const completion =
            calculateProfileCompletion(member);

        await createAuditLog({

            user: member._id,

            userRole: "member",

            action: "UPDATE",

            module: "Profile",

            description: "Updated personal profile",

            req

        });

        res.json({

            success: true,

            message: "Profile updated successfully.",

            completion,

            member

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// CHANGE PASSWORD
// ==========================================

exports.changePassword = async (req, res) => {

    try {

        const {

            currentPassword,

            newPassword,

            confirmPassword

        } = req.body;

        const member =
            await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({

                success: false,

                message: "Member not found."

            });

        }

        const correct =
            await bcrypt.compare(
                currentPassword,
                member.password
            );

        if (!correct) {

            return res.status(400).json({

                success: false,

                message: "Current password is incorrect."

            });

        }

        if (newPassword !== confirmPassword) {

            return res.status(400).json({

                success: false,

                message: "Passwords do not match."

            });

        }

        if (newPassword.length < 8) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 8 characters."

            });

        }

        member.password = newPassword;

        member.mustChangePassword = false;

        member.passwordChangedAt = new Date();

        member.failedLoginAttempts = 0;

        member.accountLockedUntil = null;

        await member.save();

        await createAuditLog({

            user: member._id,

            userRole: "member",

            action: "CHANGE_PASSWORD",

            module: "Security",

            description: "Password changed successfully.",

            req

        });

        res.json({

            success: true,

            message: "Password updated successfully."

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* ==========================================
   CHANGE PASSWORD
========================================== */



exports.getSummary = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id)
            .select("-password")
            .lean();

        if (!member) {

            return res.status(404).json({

                success: false,

                message: "Member not found."

            });

        }

        const completion =
            calculateProfileCompletion(member);

        const dependents =
            await Dependent.countDocuments({

                member: member._id,

                active: true

            });

        res.json({

            success: true,

            summary: {

                memberNumber:
                    member.memberNumber,

                fullName:
                    member.fullName,

                username:
                    member.username,

                email:
                    member.email,

                phone:
                    member.phone,

                contribution:
                    member.monthlyContribution,

                status:
                    member.status,

                verified:
                    member.verified,

                online:
                    member.online,

                profileCompletion:
                    completion.percentage,

                dependents,

                joinDate:
                    member.joinDate,

                lastLogin:
                    member.lastLogin,

                lastSeen:
                    member.lastSeen

            }

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// PROFILE STATUS
// ==========================================

exports.getProfileStatus = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({

                success: false,

                message: "Member not found."

            });

        }

        const completion =
            calculateProfileCompletion(member);

        const eligible =

            completion.percentage === 100 &&

            member.verified &&

            member.status === "active";

        res.json({

            success: true,

            completion,

            eligible,

            benefits: {

                educationSupport: eligible,

                medicalSupport: eligible,

                funeralSupport: eligible,

                voting: eligible,

                claims: eligible

            }

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};




// ==========================================
// GET SETTINGS
// ==========================================

exports.getSettings = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id)
            .select(
                "notifications emailNotifications darkMode language"
            );

        if (!member) {

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        res.json({

            success:true,

            settings:{

                notifications:
                    member.notifications,

                emailNotifications:
                    member.emailNotifications,

                darkMode:
                    member.darkMode,

                language:
                    member.language

            }

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



// ==========================================
// UPDATE SETTINGS
// ==========================================

exports.updateSettings = async (req, res) => {

    try {

        const member =
            await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        if(req.body.notifications!==undefined)
            member.notifications=req.body.notifications;

        if(req.body.emailNotifications!==undefined)
            member.emailNotifications=req.body.emailNotifications;

        if(req.body.darkMode!==undefined)
            member.darkMode=req.body.darkMode;

        if(req.body.language)
            member.language=req.body.language;

        await member.save();

        await createAuditLog({

            user:member._id,

            userRole:"member",

            action:"UPDATE",

            module:"Settings",

            description:"Updated account settings.",

            req

        });

        res.json({

            success:true,

            message:"Settings updated successfully.",

            settings:{

                notifications:
                    member.notifications,

                emailNotifications:
                    member.emailNotifications,

                darkMode:
                    member.darkMode,

                language:
                    member.language

            }

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};

// ==========================================
// MEMBER ELIGIBILITY
// ==========================================

exports.getEligibility = async (req,res)=>{

    try{

        const member =
            await Member.findById(req.user._id);

        if(!member){

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        const profile =
            calculateProfileCompletion(member);

        const eligible =

            member.status==="active" &&

            member.verified &&

            profile.percentage===100;

        res.json({

            success:true,

            eligible,

            requirements:{

                profileComplete:
                    profile.percentage===100,

                verified:
                    member.verified,

                activeMember:
                    member.status==="active"

            },

            benefits:{

                funeralSupport:eligible,

                medicalSupport:eligible,

                educationSupport:eligible,

                votingRights:eligible,

                memberPortal:eligible

            }

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};

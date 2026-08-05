const bcrypt = require("bcryptjs");

const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const Contribution = require("../models/Contribution");
const News = require("../models/News");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const Dependent = require("../models/Dependent");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const EducationSupport = require("../models/EducationSupport");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

const calculateProfileCompletion =
require("../utils/calculateProfileCompletion");

const createAuditLog =
require("../utils/createAuditLog");


function coerceProfileObject(value, fallback = {}) {
    if (value == null || value === "") {
        return fallback;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);

            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            // Ignore malformed JSON and fall back below.
        }
    }

    return fallback;
}

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
        const allowedFields = [
            "phone",
            "email",
            "nationalId",
            "gender",
            "dateOfBirth",
            "maritalStatus",
            "physicalAddress",
            "siteStation",
            "customSiteStation",
            "acceptedConstitution",
            "acceptedPrivacyPolicy",
            "acceptedDeclaration",
            "emergencyContact",
            "nextOfKin",
            "mpesaNumber",
            "bankName",
            "bankBranch",
            "accountNumber",
            "occupation",
            "employer",
            "monthlyIncome",
        ];

        const parseMaybeJson = (value) => {
            if (typeof value !== "string") return value;
            try {
                const parsed = JSON.parse(value);
                return parsed;
            } catch {
                return value;
            }
        };

        const parseBoolean = (value) => {
            if (typeof value === "boolean") return value;
            if (typeof value === "number") return value === 1;
            if (typeof value === "string") {
                return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
            }
            return Boolean(value);
        };

        allowedFields.forEach((field) => {
            if (req.body[field] === undefined) return;

            let value = req.body[field];

            if (field === "nextOfKin" || field === "emergencyContact") {
                value = parseMaybeJson(value);
                if (!value || typeof value !== "object" || Array.isArray(value)) {
                    value = {};
                }
            } else if (
                field === "acceptedConstitution" ||
                field === "acceptedPrivacyPolicy" ||
                field === "acceptedDeclaration"
            ) {
                value = parseBoolean(value);
            } else if (field === "monthlyIncome") {
                value = value === "" ? 0 : Number(value) || 0;
            } else {
                value = typeof value === "string" ? value.trim() : value;
                if (field === "email" && !String(value || "").trim()) {
                    return;
                }
            }

            member[field] = value;
        });

        member.nextOfKin = coerceProfileObject(
            member.nextOfKin,
            {}
        );

        member.emergencyContact = coerceProfileObject(
            member.emergencyContact,
            {}
        );

        member.nextOfKin = {
            fullName: String(member.nextOfKin.fullName || "").trim(),
            relationship: String(member.nextOfKin.relationship || "").trim(),
            phone: String(member.nextOfKin.phone || "").trim(),
            nationalId: String(member.nextOfKin.nationalId || "").trim(),
        };

        member.emergencyContact = {
            fullName: String(member.emergencyContact.fullName || "").trim(),
            relationship: String(member.emergencyContact.relationship || "").trim(),
            phone: String(member.emergencyContact.phone || "").trim(),
        };

        member.siteStation = String(member.siteStation || "").trim();
        if (member.siteStation !== "None of above") {
            member.customSiteStation = "";
        } else {
            member.customSiteStation = String(member.customSiteStation || req.body.customSiteStation || "").trim();
        }

        if (!member.siteStation) {
            member.customSiteStation = String(member.customSiteStation || "").trim();
        }

        // ------------------------------------------
        // PROFILE PHOTO / DOCUMENT UPLOADS
        // Files are stored locally in backend/uploads.
        // ------------------------------------------
        const uploadedFiles = req.files || {};
        const fileBase = `/uploads/${req.uploadType || "profiles"}`;

        if (uploadedFiles.profileImage?.[0]) {
            const file = uploadedFiles.profileImage[0];
            member.profileImage = resolveStoredFileUrl(file, fileBase);
        }

        if (uploadedFiles.passportPhoto?.[0]) {
            const file = uploadedFiles.passportPhoto[0];
            const filePath = resolveStoredFileUrl(file, fileBase);
            member.passportPhoto = filePath;
            member.documents = member.documents || {};
            member.documents.passportPhoto = filePath;
        }

        if (uploadedFiles.nationalIdFront?.[0]) {
            const file = uploadedFiles.nationalIdFront[0];
            member.documents = member.documents || {};
            member.documents.nationalIdFront = resolveStoredFileUrl(file, fileBase);
        }

        if (uploadedFiles.nationalIdBack?.[0]) {
            const file = uploadedFiles.nationalIdBack[0];
            member.documents = member.documents || {};
            member.documents.nationalIdBack = resolveStoredFileUrl(file, fileBase);
        }

        if (uploadedFiles.signature?.[0]) {
            const file = uploadedFiles.signature[0];
            member.documents = member.documents || {};
            member.documents.signature = resolveStoredFileUrl(file, fileBase);
        }

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

                profileCompletion: completion,
                profileCompletionPercentage:
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
                "notifications emailNotifications darkMode language themeColor"
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
                    member.language,

                themeColor:
                    member.themeColor || "#ff7a00"

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

        if(req.body.themeColor)
            member.themeColor = String(req.body.themeColor).trim();

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
                    member.language,

                themeColor:
                    member.themeColor || "#ff7a00"

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

            MEMBER_STATUS.ACTIVE &&

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
                    MEMBER_STATUS.ACTIVE

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


// ==========================================
// MEMBER CLAIMS / SUPPORT AGGREGATOR
// ==========================================

exports.getClaims = async (req, res) => {
    try {
        const memberId = req.user._id;

        const [medical, funeral, education] = await Promise.all([
            MedicalSupport.find({ member: memberId, isDeleted: { $ne: true } })
                .populate("dependent", "fullName relationship")
                .sort({ createdAt: -1 })
                .lean(),

            FuneralSupport.find({ member: memberId })
                .populate("dependent", "fullName relationship")
                .sort({ createdAt: -1 })
                .lean(),

            EducationSupport.find({ member: memberId })
                .populate("dependent", "fullName relationship")
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        const generic = await require("../models/SupportRequest").find({ member: req.user._id }).lean();

const claims = [
            ...medical.map(item => ({
                ...item,
                supportType: "medical",
                amount: item.requestedAmount || 0,
                documents: Array.isArray(item.documents) ? item.documents : [],
            })),
            ...funeral.map(item => ({
                ...item,
                supportType: "funeral",
                amount: item.requestedAmount || 0,
                documents: [
                    item.deathCertificate,
                    item.burialPermit,
                    item.chiefLetter,
                    ...(item.supportingDocuments || []),
                ].filter(Boolean),
            })),
            ...education.map(item => ({
                ...item,
                supportType: "education",
                amount: item.requestedAmount || 0,
                documents: [
                    item.feeStructure,
                    item.admissionLetter,
                    ...(item.supportingDocuments || []),
                ].filter(Boolean),
            })),
        ].sort(
            (a, b) =>
                new Date(b.createdAt || b.applicationDate) -
                new Date(a.createdAt || a.applicationDate)
        );

        return res.json({
            success: true,
            count: claims.length,
            claims,
        });
    } catch (error) {
        console.error("Get Member Claims Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load your support applications.",
        });
    }
};


// ==========================================
// CHAT MEMBERS
// ==========================================


exports.getChatMembers = async (req, res) => {
    try {
        const currentUserId = String(req.user?._id || req.auth?.chatId || "");
        const keyword = String(req.query.search || "").trim().toLowerCase();
        const limit = Number(req.query.limit || 500);

        const memberFilter = {
            isDeleted: { $ne: true },
            _id: { $ne: currentUserId },
        };

        const adminFilter = {
            status: { $ne: "deleted" },
            _id: { $ne: currentUserId },
        };

        if (keyword) {
            memberFilter.$or = [
                { fullName: { $regex: keyword, $options: "i" } },
                { username: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { memberNumber: { $regex: keyword, $options: "i" } },
                { department: { $regex: keyword, $options: "i" } },
                { position: { $regex: keyword, $options: "i" } },
            ];
            adminFilter.$or = [
                { fullName: { $regex: keyword, $options: "i" } },
                { name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { phone: { $regex: keyword, $options: "i" } },
                { position: { $regex: keyword, $options: "i" } },
            ];
        }

        const [members, admins, conversations] = await Promise.all([
            Member.find({ ...memberFilter, role: "member" })
                .select("fullName username profileImage online lastSeen status memberNumber department position phone email role")
                .sort({ role: 1, fullName: 1 })
                .limit(limit)
                .lean(),
            Admin.find(adminFilter)
                .select("fullName name email phone profileImage online lastSeen status role position")
                .limit(limit)
                .lean(),
            Conversation.find({
                participants: currentUserId,
                deletedFor: { $ne: currentUserId },
            })
                .select("participants _id lastMessageText lastMessageTime unreadCounts")
                .sort({ lastMessageTime: -1 })
                .lean(),
        ]);

        const conversationMap = new Map();
        conversations.forEach((conversation) => {
            const partnerId = (conversation.participants || [])
                .map((id) => id?.toString?.() || String(id))
                .find((id) => id !== currentUserId);
            if (partnerId) {
                conversationMap.set(partnerId, conversation._id.toString());
            }
        });

        const normalizeContact = (user, defaultRole) => {
            const role = String(user.role || defaultRole || "member").toLowerCase();
            const fullName = user.fullName || user.name || "User";
            const contactId = String(user._id);
            return {
                ...user,
                _id: contactId,
                fullName,
                role,
                roleLabel: role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Leader" : "Member",
                online: Boolean(user.online),
                conversationId: conversationMap.get(contactId) || null,
            };
        };

        const contacts = [
            ...members.map((member) => normalizeContact(member, "member")),
            ...admins.map((admin) => normalizeContact(admin, "admin")),
        ].filter((item) => String(item._id) !== currentUserId && String(item.role || "").toLowerCase() !== "superadmin");

        const unique = new Map();
        contacts.forEach((contact) => {
            unique.set(String(contact._id), contact);
        });

        return res.json({
            success: true,
            count: unique.size,
            members: Array.from(unique.values()).sort((a, b) => {
                const order = { superadmin: 0, admin: 1, member: 2 };
                const aRank = order[String(a.role || "member").toLowerCase()] ?? 2;
                const bRank = order[String(b.role || "member").toLowerCase()] ?? 2;
                if (aRank !== bRank) return aRank - bRank;
                return String(a.fullName || "").localeCompare(String(b.fullName || ""));
            }),
        });
    } catch (error) {
        console.error("Get Chat Members Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load chat members.",
        });
    }
};

exports.getCommunityStats = async (req,res)=>{try{const MemberModel=require("../models/Member");const Admin=require("../models/Admin");const Finance=require("../models/Finance");const [totalMembers,activeMembers,suspendedMembers,totalLeaders,book,medicalClaims,funeralClaims,educationClaims]=await Promise.all([MemberModel.countDocuments({isDeleted:false}),MemberModel.countDocuments({status:"active",isDeleted:false}),MemberModel.countDocuments({status:"suspended",isDeleted:false}),Admin.countDocuments({status:{$ne:"deleted"}}),Finance.aggregate([{ $match:{status:{$in:["approved","completed"]}}},{ $group:{_id:null,total:{$sum:{$cond:[{$in:["$type",["contribution","income"]]},"$amount",{$multiply:["$amount",-1]}]}}}}]),require("../models/MedicalSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}}),require("../models/FuneralSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}}),require("../models/EducationSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}})]);res.json({success:true,stats:{totalMembers,activeMembers,suspendedMembers,totalLeaders,bookBalance:Number(book?.[0]?.total||0),approvedClaims:medicalClaims+funeralClaims+educationClaims}})}catch(e){res.status(500).json({success:false,message:e.message})}};

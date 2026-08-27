const bcrypt = require("bcryptjs");
const redisCache = require("../services/redisCache");

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
const Policy = require("../models/Policy");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const { ensureChatProfile } = require("../utils/chatProfile");

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
    const cacheKey = `member:${req.user._id}:dashboard`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 15).catch(() => {}); return __originalJson(body); };


    try {

        const member =
            await Member.findById(req.user._id)
            .select("-password -monthlyIncome")
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
        const [pendingFuneral, pendingMedical, pendingEducation] = await Promise.all([
            FuneralSupport.countDocuments({ member: member._id, status: { $in: ["Pending", "Under Review"] } }),
            MedicalSupport.countDocuments({ member: member._id, status: { $in: ["Pending", "Under Review"] }, isDeleted: { $ne: true } }),
            EducationSupport.countDocuments({ member: member._id, status: "Pending" }),
        ]);

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

                    totalDependents,

                    verifiedDependents,

                    unreadMessages,

                    unreadNotifications,

                    pendingSupport: {
                        total: Number(pendingFuneral) + Number(pendingMedical) + Number(pendingEducation),
                        funeral: pendingFuneral,
                        medical: pendingMedical,
                        education: pendingEducation,
                    },

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
            .select("-password -monthlyIncome")
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

        const wasComplete = calculateProfileCompletion(member).percentage === 100;

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

        // Employment defaults are MIDAX-controlled and cannot be member-edited.
        if (Object.prototype.hasOwnProperty.call(req.body, "employer") || Object.prototype.hasOwnProperty.call(req.body, "position")) {
            delete req.body.employer;
            delete req.body.position;
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

        const completion =
            calculateProfileCompletion(member);

        if (completion.percentage === 100 && !member.verified && !wasComplete) {
            member.profileCompleted = true;
            member.verificationRequestedAt = new Date();
        } else {
            member.profileCompleted = completion.percentage === 100;
        }

        member.lastSeen = new Date();

        await member.save();

        if (completion.percentage === 100 && !member.verified && !wasComplete) {
            const createNotification = require("../services/notificationService").createNotification;
            const Admin = require("../models/Admin");
            const SuperAdmin = require("../models/SuperAdmin");
            const recipients = await Promise.all([
                Admin.find({ status: { $ne: "deleted" } }).select("_id").lean(),
                SuperAdmin.find({ status: { $ne: "deleted" } }).select("_id").lean(),
            ]);
            const adminRecipients = [...(recipients[0] || []).map((row) => ({ id: row._id, model: "Admin" })), ...(recipients[1] || []).map((row) => ({ id: row._id, model: "SuperAdmin" }))];
            await Promise.all(adminRecipients.map((recipient) => createNotification({
                recipient: recipient.id,
                recipientModel: recipient.model,
                sender: member._id,
                senderModel: "Member",
                title: "Member verification required",
                message: `${member.fullName || "A member"} has completed their profile to 100% and is waiting for verification.`,
                type: "system",
                referenceId: member._id,
                referenceModel: "Member",
                icon: "verified",
                link: `/admin/members?verify=${member._id}`,
            })));

            await createNotification({
                recipient: member._id,
                recipientModel: "Member",
                sender: member._id,
                senderModel: "Member",
                title: "Verification pending",
                message: "Your profile is 100% complete. Verification is now pending review by the Admin or Super Admin. Dependents and support services become available after verification.",
                type: "system",
                referenceId: member._id,
                referenceModel: "Member",
                icon: "verified",
                suppressPush: false,
            });
        }

        const savedCompletion =
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

            completion: savedCompletion,
            verificationPending: savedCompletion.percentage === 100 && !member.verified,

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
    const cacheKey = `member:${req.user._id}:summary`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 30).catch(() => {}); return __originalJson(body); };


    try {

        const member =
            await Member.findById(req.user._id)
            .select("-password -monthlyIncome")
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
    const cacheKey = `member:${req.user._id}:settings`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 30).catch(() => {}); return __originalJson(body); };


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
        await redisCache.del(`member:${req.user._id}:settings`);

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

        const policies = await Policy.find({ enabled: true }).sort({ order: 1, name: 1 }).lean();

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

            },

            policies: policies.map((policy) => ({
                ...policy,
                eligible,
            }))

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

        const [medical, funeral, education, supportRequests] = await Promise.all([
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

            require("../models/SupportRequest")
                .find({ member: memberId })
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        const normalizeDocuments = (documents = []) =>
            (Array.isArray(documents) ? documents : [])
                .map((document) => {
                    if (!document) return null;
                    if (typeof document === "string") {
                        return {
                            category: "General",
                            label: "",
                            fileName: "",
                            fileUrl: document,
                            uploadedAt: new Date(),
                        };
                    }
                    const fileUrl = document.fileUrl || document.url || document.path || "";
                    if (!fileUrl) return null;
                    return {
                        category: String(document.category || "General").trim() || "General",
                        label: String(document.label || "").trim(),
                        fileName: String(document.fileName || document.label || "").trim(),
                        fileUrl,
                        uploadedAt: document.uploadedAt || document.createdAt || new Date(),
                    };
                })
                .filter(Boolean);

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
            ...supportRequests.map(item => ({
                ...item,
                supportType: String(item.supportType || "other").toLowerCase(),
                amount: item.requestedAmount || 0,
                documents: normalizeDocuments(item.documents),
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
// ==========================================
// CHAT MEMBERS
// ==========================================


exports.getChatMembers = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || req.auth?.role || "").toLowerCase();
        const currentUserId = String(req.auth?.chatId || req.user?.chatMemberId || req.user?._id || req.user?.id || "").trim();
        const keyword = String(req.query.search || "").trim().toLowerCase();
        const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 1000);
        const elevated = ["admin", "superadmin"].includes(String(req.user?.role || req.auth?.role || "").toLowerCase());
        const siteStation = String(req.query.siteStation || "").trim();
        const department = String(req.query.department || "").trim();
        const position = String(req.query.position || "").trim();
        const status = String(req.query.status || "").trim();
        const online = req.query.online === undefined || !elevated ? "" : String(req.query.online).trim();
        const verified = req.query.verified === undefined || !elevated ? "" : String(req.query.verified).trim();

        // Resolve every identity associated with the logged-in portal account.
        // Admin/SuperAdmin accounts have a mirrored Member chat profile, so both
        // the portal-account ID and chat-profile ID must be excluded.
        const actorPortalId = String(req.user?._id || req.auth?.id || "").trim();
        const actorChatId = String(req.auth?.chatId || req.user?.chatMemberId || currentUserId || "").trim();
        const actorEmail = String(req.user?.email || "").trim().toLowerCase();
        const actorPhone = String(req.user?.phone || req.user?.mobile || req.user?.telephone || "").replace(/\D/g, "");
        const actorExclusionIds = [currentUserId, actorChatId, actorPortalId].filter(Boolean);

        const memberFilter = {
            isDeleted: { $ne: true },
            _id: { $nin: actorExclusionIds },
        };

        if (elevated) {
            if (siteStation && siteStation !== "all") memberFilter.siteStation = siteStation;
            if (department && department !== "all") memberFilter.department = department;
            if (position && position !== "all") memberFilter.position = position;
            if (status && status !== "all") memberFilter.status = status;
            if (online === "true" || online === "false") memberFilter.online = online === "true";
            if (verified === "true" || verified === "false") memberFilter.verified = verified === "true";
        }
        if (actorEmail || actorPhone) {
            memberFilter.$and = [
                ...(memberFilter.$and || []),
                {
                    $nor: [
                        ...(actorEmail ? [{ email: actorEmail }] : []),
                        ...(actorPhone ? [{ phone: { $regex: actorPhone.slice(-9) + "$" } }] : []),
                        ...(actorPortalId ? [{ portalOwnerId: actorPortalId }] : []),
                    ],
                },
            ];
        }

        const adminFilter = {
            status: { $ne: "deleted" },
            _id: { $nin: actorExclusionIds },
        };
        if (elevated) {
            if (department && department !== "all") adminFilter.department = department;
            if (position && position !== "all") adminFilter.position = position;
            if (status && status !== "all") adminFilter.status = status;
            if (online === "true" || online === "false") adminFilter.online = online === "true";
        }

        if (keyword) {
            memberFilter.$or = [
                { fullName: { $regex: keyword, $options: "i" } },
                { username: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { memberNumber: { $regex: keyword, $options: "i" } },
                { department: { $regex: keyword, $options: "i" } },
                { position: { $regex: keyword, $options: "i" } },
                { siteStation: { $regex: keyword, $options: "i" } },
            ];
            adminFilter.$or = [
                { fullName: { $regex: keyword, $options: "i" } },
                { name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { phone: { $regex: keyword, $options: "i" } },
                { position: { $regex: keyword, $options: "i" } },
            ];
        }

        if (actorEmail || actorPhone) {
            adminFilter.$and = [
                { $nor: [
                    ...(actorEmail ? [{ email: actorEmail }] : []),
                    ...(actorPhone ? [{ phone: { $regex: actorPhone.slice(-9) + "$" } }] : []),
                    ...(actorPortalId ? [{ portalOwnerId: actorPortalId }] : []),
                ] },
                ...(adminFilter.$and || []),
            ];
        }

        const [members, adminRecords, conversations] = await Promise.all([
            Member.find({ ...memberFilter, role: "member" })
                .select("fullName username profileImage online lastSeen status memberNumber department position siteStation customSiteStation phone email role verified")
                .sort({ role: 1, fullName: 1 })
                .limit(limit)
                .lean(),
            Admin.find(adminFilter)
                .select("_id fullName name username email phone profileImage online lastSeen status role position memberNumber")
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

        const looksLikeUrl = (value) => /^(https?:\/\/|www\.)/i.test(String(value || "").trim()) || String(value || "").includes("cloudinary.com");

        const normalizeDisplayName = (user, fallback = "User") => {
            const raw = String(user?.fullName || user?.name || fallback || "User").trim();
            if (!raw || looksLikeUrl(raw)) {
                return String(user?.username || user?.email || user?.memberNumber || fallback || "User").trim() || "User";
            }
            return raw;
        };

        const normalizeContact = (user, defaultRole) => {
            const role = String(user.role || defaultRole || "member").toLowerCase();
            const contactId = String(user._id);
            return {
                ...user,
                _id: contactId,
                fullName: normalizeDisplayName(user, role === "admin" ? "Leader" : "Member"),
                role,
                roleLabel: role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Leader" : "Member",
                online: Boolean(user.online),
                conversationId: conversationMap.get(contactId) || null,
            };
        };

        // Normalize identities across Member/Admin collections before returning
        // contacts. This prevents a stale member record and a current admin
        // record for the same person from appearing twice in chat.
        const normalizeIdentity = (value) =>
            String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

        const normalizePhone = (value) =>
            String(value || "").replace(/\D/g, "");

        const identityKeys = (user) => {
            const keys = [];
            const email = normalizeIdentity(user.email);
            const username = normalizeIdentity(user.username);
            const memberNumber = normalizeIdentity(user.memberNumber);
            const phone = normalizePhone(user.phone);

            if (email) keys.push(`email:${email}`);
            if (username) keys.push(`username:${username}`);
            if (memberNumber) keys.push(`memberNumber:${memberNumber}`);
            if (!email && !username && !memberNumber && phone && phone.length >= 9) {
                keys.push(`phone:${phone}`);
            }
            return keys;
        };

        // Conversations are stored against Member chat-profile IDs. Leadership
        // accounts therefore use their mirrored chat profile ID instead of the
        // Admin collection ID; otherwise an administrator can see themselves
        // as a contact and open a self-conversation.
        const adminProfiles = await Promise.all(
            adminRecords.map(async (admin) => {
                try {
                    const profile = await ensureChatProfile(admin);
                    if (profile) {
                        return {
                            ...(typeof profile.toObject === "function" ? profile.toObject() : profile),
                            role: "admin",
                            status: "active",
                            sourceAdminId: String(admin._id),
                            position: admin.position || profile.position || "",
                        };
                    }
                } catch (profileError) {
                    console.error("Admin chat profile sync error:", profileError);
                }
                return {
                    ...admin,
                    role: "admin",
                };
            })
        );

        const contacts = [
            ...members.map((member) => normalizeContact(member, "member")),
            ...adminProfiles.map((admin) => normalizeContact(admin, "admin")),
        ].filter((item) => {
            const itemId = String(item._id || "");
            const ownerId = String(item.portalOwnerId || item.sourceAdminId || "");
            const email = String(item.email || "").trim().toLowerCase();
            const phone = String(item.phone || "").replace(/\D/g, "");
            const sameId = actorExclusionIds.includes(itemId) || actorExclusionIds.includes(ownerId);
            const sameEmail = Boolean(actorEmail && email && actorEmail === email);
            const samePhone = Boolean(actorPhone && phone && phone.slice(-9) === actorPhone.slice(-9));
            return !sameId &&
                !sameEmail &&
                !samePhone &&
                String(item.role || "").toLowerCase() !== "superadmin" &&
                String(item.status || "").toLowerCase() !== "deleted";
        });

        // Identity-aware dedupe. Prefer an active administrator/leader when
        // both collections contain the same real person, otherwise keep the
        // most complete/active record.
        const unique = new Map();
        const seenKeys = new Map();
        const score = (contact) =>
            (contact.role === "admin" ? 20 : 10) +
            (contact.status === "active" ? 5 : 0) +
            (contact.profileImage ? 2 : 0) +
            (contact.email ? 1 : 0) +
            (contact.phone ? 1 : 0) +
            (contact.memberNumber ? 1 : 0);

        contacts.forEach((contact) => {
            const keys = identityKeys(contact);
            const existingIds = new Set(keys.flatMap((key) => seenKeys.get(key) || []));
            const existing = Array.from(existingIds)
                .map((id) => unique.get(id))
                .find(Boolean);

            if (!existing) {
                unique.set(contact._id, contact);
                keys.forEach((key) => {
                    const list = seenKeys.get(key) || [];
                    list.push(contact._id);
                    seenKeys.set(key, list);
                });
                return;
            }

            if (score(contact) > score(existing)) {
                unique.delete(existing._id);
                unique.set(contact._id, contact);
                keys.forEach((key) => {
                    const list = (seenKeys.get(key) || []).filter((id) => id !== existing._id);
                    if (!list.includes(contact._id)) list.push(contact._id);
                    seenKeys.set(key, list);
                });
            }
        });

        const responseMembers = Array.from(unique.values()).sort((a, b) => {
                const order = { superadmin: 0, admin: 1, member: 2 };
                const aRank = order[String(a.role || "member").toLowerCase()] ?? 2;
                const bRank = order[String(b.role || "member").toLowerCase()] ?? 2;
                if (aRank !== bRank) return aRank - bRank;
                return String(a.fullName || "").localeCompare(String(b.fullName || ""));
            });

        let filterOptions = {};
        if (elevated) {
            const optionsBase = { role: "member", isDeleted: { $ne: true } };
            const [stations, departments, positions, statuses] = await Promise.all([
                Member.distinct("siteStation", optionsBase),
                Member.distinct("department", optionsBase),
                Member.distinct("position", optionsBase),
                Member.distinct("status", optionsBase),
            ]);
            filterOptions = {
                siteStation: stations.filter(Boolean).sort(),
                department: departments.filter(Boolean).sort(),
                position: positions.filter(Boolean).sort(),
                status: statuses.filter(Boolean).sort(),
                verified: ["true", "false"],
            };
        }

        return res.json({
            success: true,
            count: responseMembers.length,
            members: responseMembers,
            filterOptions,
            appliedFilters: { siteStation, department, position, status, online, verified },
        });
    } catch (error) {
        console.error("Get Chat Members Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load chat members.",
        });
    }
};

exports.getCommunityStats = async (req,res)=>{
    const cacheKey = `public:community:stats`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 30).catch(() => {}); return __originalJson(body); };
try{const MemberModel=require("../models/Member");const Admin=require("../models/Admin");const Finance=require("../models/Finance");const [totalMembers,activeMembers,suspendedMembers,totalLeaders,book,medicalClaims,funeralClaims,educationClaims]=await Promise.all([MemberModel.countDocuments({isDeleted:false}),MemberModel.countDocuments({status:"active",isDeleted:false}),MemberModel.countDocuments({status:"suspended",isDeleted:false}),Admin.countDocuments({status:{$ne:"deleted"}}),Finance.aggregate([{ $match:{status:{$in:["approved","completed"]}}},{ $group:{_id:null,total:{$sum:{$cond:[{$in:["$type",["contribution","income"]]},"$amount",{$multiply:["$amount",-1]}]}}}}]),require("../models/MedicalSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}}),require("../models/FuneralSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}}),require("../models/EducationSupport").countDocuments({status:{$in:["Approved","Paid","Completed","Closed"]}})]);res.json({success:true,stats:{totalMembers,activeMembers,suspendedMembers,totalLeaders,bookBalance:Number(book?.[0]?.total||0),approvedClaims:medicalClaims+funeralClaims+educationClaims}})}catch(e){res.status(500).json({success:false,message:e.message})}};

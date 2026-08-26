const Dependent = require("../models/Dependent");
const Member = require("../models/Member");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");
const redisCache = require("../services/redisCache");

// ======================================================
// ADD DEPENDENT
// POST /api/dependents
// ======================================================

exports.addDependent = async (req, res) => {
    try {

        const member = await Member.findById(req.user._id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found."
            });
        }

        const {
            fullName,
            relationship,
            gender,
            dateOfBirth,
            nationalId,
            birthCertificateNumber,
            phone,
            email,
            county,
            address,
            school,
            admissionNumber,
            educationLevel,
            occupation,
            employer,
            medicalConditions,
            isNextOfKin
        } = req.body;

        const existing = await Dependent.findOne({
            member: member._id,
            fullName,
            relationship,
            dateOfBirth
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Dependent already exists."
            });
        }

        const dependent = await Dependent.create({

            member: member._id,

            fullName,
            relationship,
            gender,
            dateOfBirth,

            nationalId,
            birthCertificateNumber,

            phone,
            email,

            county,
            address,

            school,
            admissionNumber,
            educationLevel,

            occupation,
            employer,

            medicalConditions,

            isNextOfKin

        });

        await redisCache.invalidateMany([`member:${member._id}:dashboard`, `member:${member._id}:dependents`]);
        await createAuditLog({
            user: member._id,
            userRole: "member",
            action: "CREATE",
            module: "Dependent",
            description: `Added dependent ${dependent.fullName}`,
            req
        });

        res.status(201).json({
            success: true,
            message: "Dependent added successfully.",
            dependent
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// ======================================================
// GET MY DEPENDENTS
// ======================================================

exports.getDependents = async (req, res) => {

    try {

        const dependents = await Dependent.find({
            member: req.user._id,
            active: true
        }).sort({
            relationship: 1,
            fullName: 1
        });

        res.json({
            success: true,
            total: dependents.length,
            dependents
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ======================================================
// GET SINGLE DEPENDENT
// ======================================================

exports.getDependent = async (req, res) => {

    try {

        const dependent = await Dependent.findById(req.params.id);

        if (!dependent) {

            return res.status(404).json({
                success: false,
                message: "Dependent not found."
            });

        }

        if (
            dependent.member.toString() !== req.user._id.toString() &&
            req.user.role === "member"
        ) {

            return res.status(403).json({
                success: false,
                message: "Access denied."
            });

        }

        res.json({
            success: true,
            dependent
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ======================================================
// UPDATE DEPENDENT
// ======================================================

exports.updateDependent = async (req, res) => {

    try {

        const dependent = await Dependent.findById(req.params.id);

        if (!dependent) {

            return res.status(404).json({
                success: false,
                message: "Dependent not found."
            });

        }

        if (
            dependent.member.toString() !== req.user._id.toString()
        ) {

            return res.status(403).json({
                success: false,
                message: "Access denied."
            });

        }

        Object.assign(dependent, req.body);

        dependent.verified = false;
        dependent.verifiedBy = null;
        dependent.verifiedAt = null;

        await dependent.save();
        await redisCache.invalidateMany([`member:${req.user._id}:dashboard`, `member:${req.user._id}:dependents`]);

        await createAuditLog({
            user: req.user._id,
            userRole: req.user.role,
            action: "UPDATE",
            module: "Dependent",
            description: `Updated dependent ${dependent.fullName}`,
            req
        });

        res.json({
            success: true,
            message: "Dependent updated successfully.",
            dependent
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ======================================================
// DELETE DEPENDENT
// ======================================================

exports.deleteDependent = async (req, res) => {

    try {

        const dependent = await Dependent.findById(req.params.id);

        if (!dependent) {

            return res.status(404).json({
                success: false,
                message: "Dependent not found."
            });

        }

        if (
            dependent.member.toString() !== req.user._id.toString()
        ) {

            return res.status(403).json({
                success: false,
                message: "Access denied."
            });

        }

        dependent.active = false;

        await dependent.save();
        await redisCache.invalidateMany([`member:${req.user._id}:dashboard`, `member:${req.user._id}:dependents`]);

        await createAuditLog({
            user: req.user._id,
            userRole: req.user.role,
            action: "DELETE",
            module: "Dependent",
            description: `Archived dependent ${dependent.fullName}`,
            req
        });

        res.json({
            success: true,
            message: "Dependent removed successfully."
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ======================================================
// VERIFY DEPENDENT (ADMIN)
// ======================================================

exports.verifyDependent = async (req, res) => {

    try {

        const dependent = await Dependent.findById(req.params.id);

        if (!dependent) {

            return res.status(404).json({
                success: false,
                message: "Dependent not found."
            });

        }

        dependent.verified = true;
        dependent.verifiedBy = req.user._id;
        dependent.verifiedAt = new Date();

        await dependent.save();

        await createNotification({

            recipient: dependent.member,
            recipientModel: "Member",

            sender: req.user._id,
            senderModel:
                req.user.role === "superadmin"
                    ? "SuperAdmin"
                    : "Admin",

            title: "Dependent Verified",

            message:
                `${dependent.fullName} has been verified successfully.`,

            type: "system",

            icon: "verified"

        });

        await createAuditLog({
            user: req.user._id,
            userRole: req.user.role,
            action: "VERIFY",
            module: "Dependent",
            description: `Verified dependent ${dependent.fullName}`,
            req
        });

        res.json({
            success: true,
            message: "Dependent verified successfully.",
            dependent
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ======================================================
// ADMIN LIST
// ======================================================

exports.getAllDependents = async (req, res) => {

    try {

        const dependents = await Dependent.find()
            .populate("member", "memberNumber fullName")
            .sort({
                createdAt: -1
            });

        res.json({
            success: true,
            total: dependents.length,
            dependents
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};
exports.getDependentsForMember = async (req,res)=>{
 try{
  const member=await Member.findById(req.params.memberId).select("_id").lean();
  if(!member)return res.status(404).json({success:false,message:"Member not found."});
  const dependents=await Dependent.find({member:member._id}).sort({createdAt:-1}).lean();
  res.json({success:true,count:dependents.length,dependents});
 }catch(error){res.status(500).json({success:false,message:error.message});}
};

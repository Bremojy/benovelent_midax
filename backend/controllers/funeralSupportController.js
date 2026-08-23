const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const FuneralSupport = require("../models/FuneralSupport");
const Member = require("../models/Member");
const Dependent = require("../models/Dependent");

const checkEligibility =
require("../utils/eligibilityChecker");

const createNotification =
require("../utils/createNotification");

const createAuditLog =
require("../utils/createAuditLog");

// ======================================================
// APPLY FOR FUNERAL SUPPORT
// POST /api/funeral/apply
// ======================================================

exports.applyFuneralSupport = async (req, res) => {

    try {

        const {

            deceasedType,

            dependent,

            deceasedName,

            relationship,

            nationalId,

            dateOfDeath,

            burialDate,

            burialLocation,

            causeOfDeath,

            requestedAmount,

            deathCertificate,

            burialPermit,

            chiefLetter,

            supportingDocuments

        } = req.body;

        // ==========================================
        // ELIGIBILITY CHECK
        // ==========================================

        const eligibility =
        await checkEligibility(req.user._id);

        if(!eligibility.eligible){

            return res.status(403).json({

                success:false,

                message:eligibility.reason

            });

        }

        const member =
        eligibility.member;

        const fileUrl = (file) =>
            resolveStoredFileUrl(file, `/uploads/${req.uploadType || "support"}`);

        const deathCertificateFile = req.files?.deathCertificate?.[0];
        const burialPermitFile = req.files?.burialPermit?.[0];
        const chiefLetterFile = req.files?.chiefLetter?.[0];
        const supportingFiles = (req.files?.supportingDocuments || []).map(
            file => fileUrl(file)
        );

        // ==========================================
        // VALIDATE DEPENDENT
        // ==========================================

        if(deceasedType==="Dependent"){

            const dep =
            await Dependent.findOne({

                _id:dependent,

                member:member._id,

                active:true

            });

            if(!dep){

                return res.status(404).json({

                    success:false,

                    message:"Dependent not found."

                });

            }

        }

        // ==========================================
        // CREATE APPLICATION
        // ==========================================

        const application =
        await FuneralSupport.create({

            member:member._id,

            memberNumber:member.memberNumber,

            contributorName:member.fullName,

            deceasedType,

            dependent,

            deceasedName,

            relationship,

            nationalId,

            dateOfDeath,

            burialDate,

            burialLocation,

            causeOfDeath,

            requestedAmount,

            deathCertificate: fileUrl(deathCertificateFile) || deathCertificate,

            burialPermit: fileUrl(burialPermitFile) || burialPermit,

            chiefLetter: fileUrl(chiefLetterFile) || chiefLetter,

            supportingDocuments: [
                ...(Array.isArray(supportingDocuments) ? supportingDocuments : []),
                ...supportingFiles,
            ].filter(Boolean),

            memberVerified:member.verified,

            profileCompletion:100,

            createdBy:member._id

        });

        // ==========================================
        // NOTIFY ADMINS
        // ==========================================

        const Admin =
        require("../models/Admin");

        const admins =
        await Admin.find().select("_id");

        for(const admin of admins){

            await createNotification({

                recipient:admin._id,

                sender:member._id,

                title:"New Funeral Support Request",

                message:
                `${member.fullName} submitted a Funeral Support application.`,

                type:"funeral",

                referenceId:
                application._id,

                referenceModel:
                "FuneralSupport",

                icon:"volunteer_activism"

            });

        }

        // ==========================================
        // AUDIT LOG
        // ==========================================

        await createAuditLog({

            user:member._id,

            userRole:"member",

            action:"CREATE",

            module:"Funeral Support",

            description:
            "Submitted Funeral Support application.",

            req

        });

        res.status(201).json({

            success:true,

            message:
            "Funeral Support application submitted successfully.",

            application

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

// ======================================================
// GET MY FUNERAL APPLICATIONS
// ======================================================

exports.getMyApplications = async (req, res) => {

    try{

        const applications =
        await FuneralSupport.find({

            member:req.user._id

        })

        .populate(
            "dependent",
            "fullName relationship"
        )

        .sort({
            createdAt:-1
        });

        res.json({

            success:true,

            total:applications.length,

            applications

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

// ======================================================
// GET SINGLE APPLICATION
// ======================================================

exports.getApplicationById = async (req,res)=>{

    try{

        const application=
        await FuneralSupport.findById(req.params.id)

        .populate(
            "member",
            "memberNumber fullName phone email"
        )

        .populate(
            "dependent",
            "fullName relationship"
        )

        .populate(
            "approvedBy",
            "fullName"
        );

        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }

        const isOwner=

        application.member._id.toString()===

        req.user._id.toString();

        const isAdmin=

        req.user.role==="admin"||

        req.user.role==="superadmin";

        if(!isOwner && !isAdmin){

            return res.status(403).json({

                success:false,

                message:"Access denied."

            });

        }

        res.json({

            success:true,

            application

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

// ======================================================
// GET ALL APPLICATIONS
// ======================================================

exports.getAllApplications = async (req,res)=>{

    try{

        const page=
        Number(req.query.page)||1;

        const limit=
        Number(req.query.limit)||10;

        const skip=
        (page-1)*limit;

        const filter={};

        if(req.query.status){

            filter.status=req.query.status;

        }

        if(req.query.memberNumber){

            filter.memberNumber={

                $regex:req.query.memberNumber,

                $options:"i"

            };

        }

        const total=
        await FuneralSupport.countDocuments(filter);

        const applications=
        await FuneralSupport.find(filter)

        .populate(
            "member",
            "memberNumber fullName"
        )

        .populate(
            "approvedBy",
            "fullName"
        )

        .sort({
            createdAt:-1
        })

        .skip(skip)

        .limit(limit);

        res.json({

            success:true,

            pagination:{

                total,

                page,

                pages:Math.ceil(total/limit),

                limit

            },

            applications

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

// ======================================================
// DASHBOARD SUMMARY
// ======================================================

exports.getFuneralSummary=async(req,res)=>{

    try{

        const pending=
        await FuneralSupport.countDocuments({

            status:"Pending"

        });

        const approved=
        await FuneralSupport.countDocuments({

            status:"Approved"

        });

        const paid=
        await FuneralSupport.countDocuments({

            status:"Paid"

        });

        const rejected=
        await FuneralSupport.countDocuments({

            status:"Rejected"

        });

        const totalRequested=
        await FuneralSupport.aggregate([

            {

                $group:{

                    _id:null,

                    total:{

                        $sum:"$requestedAmount"

                    }

                }

            }

        ]);

        const totalApproved=
        await FuneralSupport.aggregate([

            {

                $group:{

                    _id:null,

                    total:{

                        $sum:"$approvedAmount"

                    }

                }

            }

        ]);

        res.json({

            success:true,

            summary:{

                pending,

                approved,

                paid,

                rejected,

                totalRequested:

                totalRequested[0]?.total||0,

                totalApproved:

                totalApproved[0]?.total||0

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

// ======================================================
// APPROVE FUNERAL SUPPORT
// ======================================================

exports.approveApplication = async (req, res) => {

    try {

        const application =
        await FuneralSupport.findById(req.params.id);

        if (!application) {

            return res.status(404).json({
                success:false,
                message:"Application not found."
            });

        }

        if(application.status!=="Pending"){

            return res.status(400).json({
                success:false,
                message:"Only pending applications can be approved."
            });

        }

        application.status="Approved";

        application.approvedAmount=
        req.body.approvedAmount ||
        application.requestedAmount;

        application.approvalDate=
        new Date();

        application.approvedBy=
        req.user._id;

        application.remarks=
        req.body.remarks || "";

        if (!Array.isArray(application.timeline)) application.timeline = [];
        application.timeline.push({ status: "Pending", remarks: "Funeral application submitted by member.", updatedBy: req.user._id, date: new Date() });
        await application.save();

        await createNotification({

            recipient:application.member,

            sender:req.user._id,

            title:"Funeral Support Approved",

            message:`Your Funeral Support request has been approved for KSh ${application.approvedAmount}.`,

            type:"funeral",

            referenceId:application._id,

            referenceModel:"FuneralSupport",

            icon:"check_circle"

        });

        await createAuditLog({

            user:req.user._id,

            userRole:req.user.role,

            action:"APPROVE",

            module:"Funeral Support",

            description:"Approved Funeral Support application.",

            req

        });

        res.json({

            success:true,

            message:"Application approved successfully.",

            application

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

// ======================================================
// REJECT APPLICATION
// ======================================================

exports.rejectApplication = async (req,res)=>{

    try{

        const application=
        await FuneralSupport.findById(req.params.id);

        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }

        application.status="Rejected";

        application.rejectionReason=

        req.body.reason ||

        "No reason provided";

        application.approvedBy=

        req.user._id;

        application.approvalDate=

        new Date();

        await application.save();

        await createNotification({

            recipient:application.member,

            sender:req.user._id,

            title:"Funeral Support Rejected",

            message:"Your Funeral Support request has been rejected.",

            type:"funeral",

            referenceId:application._id,

            referenceModel:"FuneralSupport",

            icon:"cancel"

        });

        await createAuditLog({

            user:req.user._id,

            userRole:req.user.role,

            action:"REJECT",

            module:"Funeral Support",

            description:"Rejected Funeral Support application.",

            req

        });

        res.json({

            success:true,

            message:"Application rejected.",

            application

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

// ======================================================
// RECORD PAYMENT
// ======================================================

exports.recordPayment = async (req,res)=>{

    try{

        const application=

        await FuneralSupport.findById(req.params.id);

        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }

        application.status="Paid";

        application.paymentReference=

        req.body.paymentReference;

        application.paymentMethod=

        req.body.paymentMethod;

        application.paymentDate=

        new Date();

        application.processedBy=

        req.user._id;

        await application.save();

        await createNotification({

            recipient:application.member,

            sender:req.user._id,

            title:"Funeral Support Paid",

            message:"Your Funeral Support payment has been processed successfully.",

            type:"funeral",

            referenceId:application._id,

            referenceModel:"FuneralSupport",

            icon:"payments"

        });

        await createAuditLog({

            user:req.user._id,

            userRole:req.user.role,

            action:"PAY",

            module:"Funeral Support",

            description:"Processed Funeral Support payment.",

            req

        });

        res.json({

            success:true,

            message:"Payment recorded successfully.",

            application

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

// ======================================================
// CLOSE APPLICATION
// ======================================================

exports.closeApplication = async (req,res)=>{

    try{

        const application=
        await FuneralSupport.findById(req.params.id);

        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }

        application.status="Closed";

        application.closedDate=

        new Date();

        await application.save();

        res.json({

            success:true,

            message:"Application closed.",

            application

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

// ======================================================
// DELETE APPLICATION
// ======================================================

exports.deleteApplication = async (req,res)=>{

    try{

        const application=

        await FuneralSupport.findById(req.params.id);

        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }

        await application.deleteOne();

        await createAuditLog({

            user:req.user._id,

            userRole:req.user.role,

            action:"DELETE",

            module:"Funeral Support",

            description:"Deleted Funeral Support application.",

            req

        });

        res.json({

            success:true,

            message:"Application deleted successfully."

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


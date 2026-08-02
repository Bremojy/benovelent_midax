// ======================================================
// MEDICAL SUPPORT CONTROLLER
// Benevolent Midax Management System
// ======================================================

const MedicalSupport = require("../models/MedicalSupport");
const Member = require("../models/Member");
const Dependent = require("../models/Dependent");

const { createNotification } = require("../utils/createNotification");



// ======================================================
// HELPER
// Add Timeline Entry
// ======================================================

const addTimeline = async (
    application,
    status,
    remarks,
    user = null
) => {

    application.timeline.push({

        status,

        remarks,

        updatedBy: user,

        date: new Date()

    });

};



// ======================================================
// VALIDATE MEMBER
// ======================================================

const validateMember = async (memberId) => {

    const member = await Member.findById(memberId);

    if (!member) {

        throw new Error("Member not found.");

    }

    return member;

};



// ======================================================
// VALIDATE DEPENDENT
// ======================================================

const validateDependent = async (

    dependentId,

    memberId

) => {

    const dependent = await Dependent.findOne({

        _id: dependentId,

        member: memberId

    });

    if (!dependent) {

        throw new Error("Dependent not found.");

    }

    return dependent;

};



// ======================================================
// CREATE MEDICAL APPLICATION
// POST /api/medical/apply
// ======================================================

exports.createMedicalApplication = async (req, res) => {

    try {

        const {

            dependent,

            hospitalName,

            hospitalLocation,

            doctorName,

            doctorPhone,

            diagnosis,

            treatment,

            admissionDate,

            dischargeDate,

            emergencyLevel,

            requestedAmount

        } = req.body;



        const member = await validateMember(

            req.user._id

        );



        await validateDependent(

            dependent,

            req.user._id

        );



        const uploadedDocuments = (req.files || []).map(file => ({
            fileName: file.originalname,
            fileUrl: `/uploads/${req.uploadType || "support"}/${file.filename}`,
            uploadedAt: new Date(),
        }));

        const application = await MedicalSupport.create({

            member: req.user._id,

            memberNumber: member.memberNumber,

            dependent,

            hospitalName,

            hospitalLocation,

            doctorName,

            doctorPhone,

            diagnosis,

            treatment,

            admissionDate,

            dischargeDate,

            emergencyLevel,

            requestedAmount,

            documents: uploadedDocuments,

            createdBy: req.user._id

        });



        await addTimeline(

            application,

            "Pending",

            "Medical application submitted.",

            req.user._id

        );



        await application.save();



        await createNotification({

            recipient: req.user._id,

            sender: req.user._id,

            title: "Medical Application Submitted",

            message:
                "Your medical application has been received successfully.",

            type: "medical",

            referenceId: application._id,

            referenceModel: "MedicalSupport",

            icon: "medical_services"

        });



        res.status(201).json({

            success: true,

            message:
                "Medical application submitted successfully.",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// GET MY APPLICATIONS
// GET /api/medical/my-applications
// ======================================================

exports.getMyApplications = async (

    req,

    res

) => {

    try {

        const applications = await MedicalSupport.find({

            member: req.user._id,

            isDeleted: false

        })

            .populate(

                "dependent",

                "fullName relationship"

            )

            .sort({

                createdAt: -1

            });



        res.json({

            success: true,

            total: applications.length,

            applications

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// GET SINGLE APPLICATION
// GET /api/medical/:id
// ======================================================

exports.getApplicationById = async (

    req,

    res

) => {

    try {

        const application = await MedicalSupport.findById(

            req.params.id

        )

            .populate(

                "member",

                "memberNumber fullName phone"

            )

            .populate(

                "dependent",

                "fullName relationship"

            )

            .populate(

                "approvedBy",

                "fullName"

            )

            .populate(

                "processedBy",

                "fullName"

            );



        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }



        res.json({

            success: true,

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// CANCEL APPLICATION
// PUT /api/medical/cancel/:id
// ======================================================

exports.cancelApplication = async (

    req,

    res

) => {

    try {

        const application = await MedicalSupport.findOne({

            _id: req.params.id,

            member: req.user._id

        });



        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }



        if (application.status !== "Pending") {

            return res.status(400).json({

                success: false,

                message:
                    "Only pending applications can be cancelled."

            });

        }



        application.status = "Cancelled";



        await addTimeline(

            application,

            "Cancelled",

            "Application cancelled by member.",

            req.user._id

        );



        await application.save();



        res.json({

            success: true,

            message: "Application cancelled successfully."

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ======================================================
// GET ALL MEDICAL APPLICATIONS (ADMIN)
// GET /api/medical/admin/applications
// ======================================================

exports.getAllApplications = async (req, res) => {

    try {

        const applications = await MedicalSupport.find({

            isDeleted: false

        })

        .populate("member", "memberNumber fullName phone email")

        .populate("dependent", "fullName relationship")

        .populate("approvedBy", "fullName")

        .populate("processedBy", "fullName")

        .sort({

            createdAt: -1

        });

        res.json({

            success: true,

            total: applications.length,

            applications

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// ADMIN GET SINGLE APPLICATION
// ======================================================

exports.adminGetApplication = async (req, res) => {

    try {

        const application = await MedicalSupport.findById(

            req.params.id

        )

        .populate("member")

        .populate("dependent")

        .populate("approvedBy", "fullName")

        .populate("processedBy", "fullName");



        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }



        res.json({

            success: true,

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// MOVE TO UNDER REVIEW
// ======================================================

exports.markUnderReview = async (req, res) => {

    try {

        const { remarks } = req.body;

        const application = await MedicalSupport.findById(

            req.params.id

        );

        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }

        application.status = "Under Review";

        application.processedBy = req.user._id;

        application.remarks = remarks;

        await addTimeline(

            application,

            "Under Review",

            remarks || "Application under review.",

            req.user._id

        );

        await application.save();

        await createNotification({

            recipient: application.member,

            sender: req.user._id,

            title: "Medical Application Under Review",

            message: "Your medical application is under review.",

            type: "medical",

            referenceId: application._id,

            referenceModel: "MedicalSupport",

            icon: "hourglass_top"

        });

        res.json({

            success: true,

            message: "Application moved to Under Review.",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// APPROVE APPLICATION
// ======================================================

exports.approveApplication = async (req, res) => {

    try {

        const {

            approvedAmount,

            remarks

        } = req.body;

        const application = await MedicalSupport.findById(

            req.params.id

        );

        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }

        application.status = "Approved";

        application.approvedAmount =
            approvedAmount || application.requestedAmount;

        application.approvedBy = req.user._id;

        application.processedBy = req.user._id;

        application.approvalDate = new Date();

        application.remarks = remarks;

        await addTimeline(

            application,

            "Approved",

            remarks || "Application approved.",

            req.user._id

        );

        await application.save();

        await createNotification({

            recipient: application.member,

            sender: req.user._id,

            title: "Medical Support Approved",

            message: "Your medical support application has been approved.",

            type: "medical",

            referenceId: application._id,

            referenceModel: "MedicalSupport",

            icon: "check_circle"

        });

        res.json({

            success: true,

            message: "Medical application approved successfully.",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// REJECT APPLICATION
// ======================================================

exports.rejectApplication = async (req, res) => {

    try {

        const {

            rejectionReason

        } = req.body;

        const application = await MedicalSupport.findById(

            req.params.id

        );

        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }

        application.status = "Rejected";

        application.rejectionReason = rejectionReason;

        application.processedBy = req.user._id;

        await addTimeline(

            application,

            "Rejected",

            rejectionReason,

            req.user._id

        );

        await application.save();

        await createNotification({

            recipient: application.member,

            sender: req.user._id,

            title: "Medical Support Rejected",

            message: `Your application was rejected. Reason: ${rejectionReason}`,

            type: "medical",

            referenceId: application._id,

            referenceModel: "MedicalSupport",

            icon: "cancel"

        });

        res.json({

            success: true,

            message: "Medical application rejected.",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// MARK AS PAID
// ======================================================

exports.markAsPaid = async (req, res) => {

    try {

        const {

            paidAmount

        } = req.body;

        const application = await MedicalSupport.findById(

            req.params.id

        );

        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }

        application.status = "Paid";

        application.paidAmount = paidAmount;

        application.paymentDate = new Date();

        application.processedBy = req.user._id;

        await addTimeline(

            application,

            "Paid",

            "Funds released.",

            req.user._id

        );

        await application.save();

        res.json({

            success: true,

            message: "Medical support payment completed.",

            application

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ======================================================
// SOFT DELETE APPLICATION
// ======================================================

exports.deleteApplication = async (req, res) => {

    try {

        const application = await MedicalSupport.findById(

            req.params.id

        );

        if (!application) {

            return res.status(404).json({

                success: false,

                message: "Application not found."

            });

        }

        application.isDeleted = true;

        await application.save();

        res.json({

            success: true,

            message: "Medical application deleted."

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
// ======================================================
// MEDICAL SUMMARY
// GET /api/medical/admin/summary
// ======================================================

exports.getMedicalSummary = async (req, res) => {

    try {

        const total = await MedicalSupport.countDocuments({
            isDeleted: false
        });

        const pending = await MedicalSupport.countDocuments({
            status: "Pending",
            isDeleted: false
        });

        const underReview = await MedicalSupport.countDocuments({
            status: "Under Review",
            isDeleted: false
        });

        const approved = await MedicalSupport.countDocuments({
            status: "Approved",
            isDeleted: false
        });

        const rejected = await MedicalSupport.countDocuments({
            status: "Rejected",
            isDeleted: false
        });

        const paid = await MedicalSupport.countDocuments({
            status: "Paid",
            isDeleted: false
        });

        res.json({

            success: true,

            summary: {

                total,

                pending,

                underReview,

                approved,

                rejected,

                paid

            }

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


const mongoose = require("mongoose");

const medicalSupportSchema = new mongoose.Schema(
{
    // =====================================
    // MEMBER (CONTRIBUTOR)
    // =====================================

    member:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true,
        index:true
    },

    memberNumber:{
        type:String,
        required:true
    },

    contributorName:{
        type:String,
        required:true
    },

    // =====================================
    // PATIENT
    // =====================================

    patientType:{
        type:String,
        enum:[
            "Member",
            "Dependent"
        ],
        required:true
    },

    dependent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Dependent",
        default:null
    },

    patientName:{
        type:String,
        required:true
    },

    relationship:{
        type:String,
        required:true
    },

    gender:String,

    age:Number,

    // =====================================
    // MEDICAL DETAILS
    // =====================================

    admissionType:{
        type:String,
        enum:[
            "Outpatient",
            "Inpatient"
        ],
        required:true
    },

    hospitalName:{
        type:String,
        required:true
    },

    hospitalPhone:String,

    hospitalAddress:String,

    doctorName:String,

    doctorPhone:String,

    diagnosis:{
        type:String,
        required:true
    },

    treatment:{
        type:String,
        required:true
    },

    admissionDate:Date,

    dischargeDate:Date,

    // =====================================
    // FINANCIAL
    // =====================================

    requestedAmount:{
        type:Number,
        required:true
    },

    approvedAmount:{
        type:Number,
        default:0
    },

    paymentMethod:{
        type:String,
        default:"M-Pesa"
    },

    paymentReference:String,

    paymentDate:Date,

    // =====================================
    // DOCUMENTS
    // =====================================

    prescription:String,

    medicalReport:String,

    dischargeSummary:String,

    invoice:String,

    supportingDocuments:[String],

    // =====================================
    // STATUS
    // =====================================

    status:{
        type:String,
        enum:[
            "Pending",
            "Under Review",
            "Approved",
            "Rejected",
            "Paid",
            "Closed"
        ],
        default:"Pending"
    },

    applicationDate:{
        type:Date,
        default:Date.now
    },

    approvalDate:Date,

    closedDate:Date,

    rejectionReason:String,

    remarks:String,

    // =====================================
    // ELIGIBILITY
    // =====================================

    memberVerified:{
        type:Boolean,
        default:false
    },

    profileCompletion:{
        type:Number,
        default:0
    },

    // =====================================
    // ADMIN
    // =====================================

    approvedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    },

    processedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    },

    // =====================================
    // AUDIT
    // =====================================

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member"
    },

    updatedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member"
    }

},
{
    timestamps:true
});

medicalSupportSchema.index({
    member:1
});

medicalSupportSchema.index({
    status:1
});

medicalSupportSchema.index({
    applicationDate:-1
});

medicalSupportSchema.index({
    patientType:1
});

module.exports =
mongoose.models.MedicalSupport ||
mongoose.model(
    "MedicalSupport",
    medicalSupportSchema
);
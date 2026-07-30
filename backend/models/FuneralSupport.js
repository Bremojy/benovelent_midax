const mongoose = require("mongoose");

const funeralSupportSchema = new mongoose.Schema(
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
        required:true,
        trim:true
    },

    contributorName:{
        type:String,
        required:true,
        trim:true
    },

    // =====================================
    // DECEASED PERSON
    // =====================================

    deceasedType:{
        type:String,
        enum:["Member","Dependent"],
        required:true
    },

    dependent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Dependent",
        default:null
    },

    deceasedName:{
        type:String,
        required:true,
        trim:true
    },

    relationship:{
        type:String,
        required:true,
        trim:true
    },

    nationalId:{
        type:String,
        default:""
    },

    dateOfDeath:{
        type:Date,
        required:true
    },

    burialDate:{
        type:Date,
        required:true
    },

    burialLocation:{
        type:String,
        required:true,
        trim:true
    },

    causeOfDeath:{
        type:String,
        default:""
    },

    // =====================================
    // BENEFIT
    // =====================================

    requestedAmount:{
        type:Number,
        required:true,
        min:0
    },

    approvedAmount:{
        type:Number,
        default:0,
        min:0
    },

    paymentMethod:{
        type:String,
        enum:[
            "M-Pesa",
            "Bank Transfer",
            "Cheque",
            "Cash"
        ],
        default:"M-Pesa"
    },

    paymentReference:{
        type:String,
        default:""
    },

    paymentDate:Date,

    // =====================================
    // DOCUMENTS
    // =====================================

    deathCertificate:{
        type:String,
        default:""
    },

    burialPermit:{
        type:String,
        default:""
    },

    chiefLetter:{
        type:String,
        default:""
    },

    supportingDocuments:[
        {
            type:String
        }
    ],

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

    rejectionReason:{
        type:String,
        default:""
    },

    remarks:{
        type:String,
        default:""
    },

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
    // ADMIN PROCESSING
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

// =====================================
// INDEXES
// =====================================

funeralSupportSchema.index({
    member:1
});

funeralSupportSchema.index({
    status:1
});

funeralSupportSchema.index({
    applicationDate:-1
});

funeralSupportSchema.index({
    deceasedType:1
});

funeralSupportSchema.index({
    burialDate:-1
});

module.exports =
mongoose.models.FuneralSupport ||
mongoose.model(
    "FuneralSupport",
    funeralSupportSchema
);
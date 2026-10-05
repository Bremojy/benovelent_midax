const mongoose = require("mongoose");

const medicalSupportSchema = new mongoose.Schema(
{
    // ==========================
    // MEMBER
    // ==========================
    member:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true
    },

    memberNumber:{
        type:String,
        trim:true
    },

    // ==========================
    // DEPENDENT
    // ==========================
    dependent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Dependent",
        required:true
    },

    // ==========================
    // HOSPITAL DETAILS
    // ==========================
    hospitalName:{
        type:String,
        required:true,
        trim:true
    },

    hospitalLocation:{
        type:String,
        trim:true
    },

    doctorName:{
        type:String,
        trim:true
    },

    doctorPhone:{
        type:String,
        trim:true
    },

    diagnosis:{
        type:String,
        required:true,
        trim:true
    },

    treatment:{
        type:String,
        trim:true
    },

    admissionDate:{
        type:Date
    },

    dischargeDate:{
        type:Date
    },

    emergencyLevel:{
        type:String,
        enum:[
            "Low",
            "Medium",
            "High",
            "Critical"
        ],
        default:"Low"
    },

    // ==========================
    // FINANCIAL
    // ==========================
    requestedAmount:{
        type:Number,
        required:true,
        min:0
    },

    approvedAmount:{
        type:Number,
        default:0
    },

    paidAmount:{
        type:Number,
        default:0
    },

    balance:{
        type:Number,
        default:0
    },

    paymentDate:{
        type:Date
    },

    paymentReference:{
        type:String,
        trim:true,
        default:""
    },

    // ==========================
    // DOCUMENTS
    // ==========================
    documents:[
        {
            fileName:String,
            fileUrl:String,
            uploadedAt:{
                type:Date,
                default:Date.now
            }
        }
    ],

    // ==========================
    // STATUS
    // ==========================
    status:{
        type:String,
        enum: [
    "Pending",
    "Under Review",
    "Documents Required",
    "Eligibility Review",
    "Approval Review",
    "Approved",
    "Rejected",
    "Paid",
    "Cancelled",
    "Closed"
],
        default:"Pending"
    },

    // ==========================
    // APPROVAL
    // ==========================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "approvedByModel",
      default: null,
    },

    approvedByModel: {
      type: String,
      enum: ["Admin", "SuperAdmin"],
      default: "Admin",
    },

    processedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    },

    approvalDate:{
        type:Date
    },

    rejectionReason:{
        type:String,
        trim:true
    },

    remarks:{
        type:String,
        trim:true
    },

    // ==========================
    // TIMELINE
    // ==========================
    timeline:[
        {
            status:String,
            remarks:String,
            updatedBy:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Admin"
            },
            date:{
                type:Date,
                default:Date.now
            }
        }
    ],

    // ==========================
    // NOTIFICATIONS
    // ==========================
    memberNotified:{
        type:Boolean,
        default:false
    },

    // ==========================
    // AUDIT
    // ==========================
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member"
    },

    updatedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    },

    // Visibility is a staff-governed presentation state. Hidden claims remain
    // stored and available to authorized staff, but are filtered server-side
    // from member claim responses.
    memberVisible: { type: Boolean, default: true, index: true },
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    publishedNewsId: { type: mongoose.Schema.Types.ObjectId, ref: "News", default: null },
    publishedToNews: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },

    isDeleted:{ type:Boolean, default:false, index:true },
    deletedAt:{ type:Date, default:null },
    deletedBy:{ type:mongoose.Schema.Types.ObjectId, default:null }

},
{
    timestamps:true
});


// =====================================
// Calculate Outstanding Balance
// =====================================
medicalSupportSchema.pre("save",async function(){

    this.balance =
    (this.approvedAmount || 0) -
    (this.paidAmount || 0);


});


// =====================================
// Indexes
// =====================================
medicalSupportSchema.index({
    member:1,
    status:1
});

medicalSupportSchema.index({
    createdAt:-1
});

medicalSupportSchema.index({
    hospitalName:1
});

module.exports = mongoose.model(
    "MedicalSupport",
    medicalSupportSchema
);
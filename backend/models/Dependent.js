const mongoose = require("mongoose");

const dependentSchema = new mongoose.Schema(
{
    member:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true,
        index:true
    },

    fullName:{
        type:String,
        required:true,
        trim:true
    },

    relationship:{
        type:String,
        enum:[
            "Spouse",
            "Son",
            "Daughter",
            "Father",
            "Mother",
            "Brother",
            "Sister",
            "Guardian",
            "Other"
        ],
        required:true
    },

    gender:{
        type:String,
        enum:[
            "Male",
            "Female",
            "Other"
        ],
        required:true
    },

    dateOfBirth:{
        type:Date,
        required:true
    },

    nationalId:{
        type:String,
        default:""
    },

    birthCertificateNumber:{
        type:String,
        default:""
    },

    phone:{
        type:String,
        default:""
    },

    email:{
        type:String,
        default:""
    },

    county:{
        type:String,
        default:""
    },

    address:{
        type:String,
        default:""
    },

    school:{
        type:String,
        default:""
    },

    admissionNumber:{
        type:String,
        default:""
    },

    educationLevel:{
        type:String,
        enum:[
            "",
            "Primary",
            "Junior Secondary",
            "Secondary",
            "College",
            "University",
            "TVET",
            "Other"
        ],
        default:""
    },

    occupation:{
        type:String,
        default:""
    },

    employer:{
        type:String,
        default:""
    },

    medicalConditions:[
        {
            type:String
        }
    ],

    profilePhoto:{
        type:String,
        default:""
    },

    birthCertificate:{
        type:String,
        default:""
    },

    nationalIdFront:{
        type:String,
        default:""
    },

    nationalIdBack:{
        type:String,
        default:""
    },

    isNextOfKin:{
        type:Boolean,
        default:false
    },

    active:{
        type:Boolean,
        default:true
    },

    verified:{
        type:Boolean,
        default:false
    },

    verifiedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin"
    },

    verifiedAt:{
        type:Date
    }

},
{
    timestamps:true
});

dependentSchema.index({
    member:1,
    relationship:1
});

module.exports =
mongoose.models.Dependent ||
mongoose.model(
    "Dependent",
    dependentSchema
);
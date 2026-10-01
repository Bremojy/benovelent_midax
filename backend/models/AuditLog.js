const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
{
    user:{
        type:mongoose.Schema.Types.ObjectId,
        refPath:"userModel",
        required:true
    },

    userModel:{
        type:String,
        enum:[
            "Member",
            "Admin",
            "SuperAdmin"
        ],
        required:true
    },

    userRole:{
        type:String,
        enum:[
            "member",
            "admin",
            "superadmin"
        ],
        required:true
    },

    action:{
        type:String,
        required:true,
        trim:true
    },

    module:{
        type:String,
        required:true,
        trim:true
    },

    description:{
        type:String,
        required:true,
        trim:true
    },

    ipAddress:{
        type:String,
        default:""
    },

    userAgent:{
        type:String,
        default:""
    },

    endpoint:{
        type:String,
        default:""
    },

    method:{
        type:String,
        default:""
    },

    status:{
        type:String,
        enum:[
            "SUCCESS",
            "FAILED"
        ],
        default:"SUCCESS"
    },

    metadata:{
        type:Object,
        default:{}
    }

},
{
    timestamps:true
});

auditLogSchema.index({
    user:1,
    createdAt:-1
});

auditLogSchema.index({
    module:1
});

auditLogSchema.index({
    action:1
});

// Governance audit history is append-only. Administrative account cleanup,
// retention and account retirement must never erase the evidence trail.
const rejectAuditDeletion = function rejectAuditDeletion(next) {
    next(new Error("Audit logs are append-only and cannot be deleted."));
};

for (const method of ["deleteOne", "deleteMany", "findOneAndDelete", "findByIdAndDelete", "findOneAndRemove", "findByIdAndRemove"]) {
    auditLogSchema.pre(method, rejectAuditDeletion);
}

module.exports =
mongoose.models.AuditLog ||
mongoose.model(
    "AuditLog",
    auditLogSchema
);


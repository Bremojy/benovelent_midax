const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema({

    member:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true
    },

    finance:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Finance",
        default:null
    },

    month:{
        type:Number,
        required:true,
        min:1,
        max:12
    },

    year:{
        type:Number,
        required:true
    },

    expectedAmount:{
        type:Number,
        required:true
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

    paymentMethod:{
        type:String,
        enum:[
            "Cash",
            "M-PESA",
            "Bank",
            "Cheque"
        ],
        default:"M-PESA"
    },

    receiptNumber:{
        type:String,
        default:""
    },

    mpesaCode:{
        type:String,
        default:""
    },

    status:{
        type:String,
        enum:[
            "pending",
            "partial",
            "paid",
            "overdue"
        ],
        default:"pending"
    },

    approvedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin",
        default:null
    },

    approvedAt:{
        type:Date
    },

    notes:{
        type:String,
        default:""
    }

},
{
    timestamps:true
});

contributionSchema.pre("save",function(next){

    this.balance=this.expectedAmount-this.paidAmount;

    if(this.balance<=0){

        this.status="paid";

    }

    else if(this.paidAmount>0){

        this.status="partial";

    }

    next();

});

contributionSchema.index({

    member:1,

    month:1,

    year:1

},
{

    unique:true

});

contributionSchema.index({

    status:1

});

module.exports =
    mongoose.models.Contribution ||
    mongoose.model("Contribution", contributionSchema);
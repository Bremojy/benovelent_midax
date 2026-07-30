const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
{
    organizationName:{
        type:String,
        default:"Benevolent Midax"
    },

    organizationEmail:{
        type:String,
        default:""
    },

    organizationPhone:{
        type:String,
        default:""
    },

    organizationAddress:{
        type:String,
        default:""
    },

    logo:{
        type:String,
        default:""
    },

    // =====================================
    // EDUCATION SUPPORT
    // =====================================

    educationSupport:{

        enabled:{
            type:Boolean,
            default:true
        },

        maximumAmount:{
            type:Number,
            default:20000
        },

        interestRate:{
            type:Number,
            default:10
        },

        repaymentMonths:{
            type:Number,
            default:12
        },

        monthlyLimit:{
            type:Number,
            default:4
        }

    },

    // =====================================
    // MEDICAL SUPPORT
    // =====================================

    medicalSupport:{

        enabled:{
            type:Boolean,
            default:true
        },

        maximumAmount:{
            type:Number,
            default:50000
        }

    },

    // =====================================
    // FUNERAL SUPPORT
    // =====================================

    funeralSupport:{

        enabled:{
            type:Boolean,
            default:true
        },

        principalMember:{
            type:Number,
            default:100000
        },

        spouse:{
            type:Number,
            default:50000
        },

        child:{
            type:Number,
            default:30000
        },

        parent:{
            type:Number,
            default:30000
        }

    },

    // =====================================
    // CONTRIBUTIONS
    // =====================================

    contribution:{

        monthlyAmount:{
            type:Number,
            default:500
        },

        gracePeriodDays:{
            type:Number,
            default:7
        }

    },

    maintenanceMode:{
        type:Boolean,
        default:false
    }

},
{
    timestamps:true
});

module.exports =
mongoose.models.SystemSettings ||
mongoose.model(
    "SystemSettings",
    systemSettingsSchema
);
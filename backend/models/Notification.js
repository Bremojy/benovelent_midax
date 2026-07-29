const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true
    },

    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member"
    },

    title:{
        type:String,
        required:true,
        trim:true
    },

    message:{
        type:String,
        required:true,
        trim:true
    },

    type:{
        type:String,
        enum:[
            "message",
            "reaction",
            "news",
            "poll",
            "vote",
            "finance",
            "contribution",
            "announcement",
            "system"
        ],
        default:"system"
    },

    referenceId:{
        type:mongoose.Schema.Types.ObjectId
    },

    referenceModel:{
        type:String,
        default:""
    },

    icon:{
        type:String,
        default:"notifications"
    },

    read:{
        type:Boolean,
        default:false
    },

    readAt:{
        type:Date
    }

},
{
    timestamps:true
});

notificationSchema.index({recipient:1,read:1});
notificationSchema.index({createdAt:-1});

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);
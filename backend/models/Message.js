const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
{
    member:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true
    },

    emoji:{
        type:String,
        required:true
    }

},
{
    _id:false
});

const messageSchema = new mongoose.Schema(
{

    conversation:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Conversation",
        required:true
    },

    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member",
        required:true
    },

    message:{
        type:String,
        default:""
    },

    messageType:{
        type:String,
        enum:[
            "text",
            "image",
            "video",
            "audio",
            "document",
            "call"
        ],
        default:"text"
    },

    attachment:{
        type:String,
        default:""
    },

    fileName:{
        type:String,
        default:""
    },

    fileSize:{
        type:Number,
        default:0
    },

    mimeType:{
        type:String,
        default:""
    },

    callType:{
        type:String,
        enum:["audio","video"],
        default:undefined
    },

    callStatus:{
        type:String,
        enum:["completed","declined","missed"],
        default:undefined
    },

    callDurationSeconds:{
        type:Number,
        default:0,
        min:0
    },

    replyTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message"
    },

    edited:{
        type:Boolean,
        default:false
    },

    editedAt:{
        type:Date
    },

    delivered:{
        type:Boolean,
        default:false
    },

    deliveredAt:{
        type:Date
    },

    seenBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    seenAt:{
        type:Date
    },

    reactions:[reactionSchema],

    deletedFor:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    deletedForEveryone:{
        type:Boolean,
        default:false
    }

},
{
    timestamps:true
});

messageSchema.index({conversation:1,createdAt:-1});
messageSchema.index({sender:1});

module.exports =
    mongoose.models.Message ||
    mongoose.model("Message", messageSchema);
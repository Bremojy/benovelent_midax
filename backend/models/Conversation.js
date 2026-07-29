const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
    participants:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member",
            required:true
        }
    ],

    isGroup:{
        type:Boolean,
        default:false
    },

    groupName:{
        type:String,
        default:""
    },

    groupImage:{
        type:String,
        default:""
    },

    groupDescription:{
        type:String,
        default:""
    },

    admins:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    lastMessage:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message"
    },

    lastMessageText:{
        type:String,
        default:""
    },

    lastMessageSender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Member"
    },

    lastMessageTime:{
        type:Date,
        default:Date.now
    },

    unreadCounts:{
        type:Map,
        of:Number,
        default:{}
    },

    archivedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    mutedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    pinnedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    deletedFor:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    typingUsers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    active:{
        type:Boolean,
        default:true
    }

},
{
    timestamps:true
}
);

conversationSchema.index({participants:1});
conversationSchema.index({lastMessageTime:-1});

module.exports =
    mongoose.models.Conversation ||
    mongoose.model("Conversation", conversationSchema);
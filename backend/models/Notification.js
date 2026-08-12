const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
   recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "recipientModel",
},

recipientModel: {
    type: String,
    enum: ["Member", "Admin", "SuperAdmin"],
    default: "Member",
},

sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "senderModel",
},

senderModel: {
    type: String,
    enum: ["Member", "Admin", "SuperAdmin"],
    default: "Member",
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

    type: {
    type: String,
    enum: [
        "message",
        "call",
        "audio_call",
        "video_call",
        "reaction",
        "news",
        "poll",
        "vote",
        "finance",
        "contribution",
        "announcement",
        "education",
        "medical",
        "funeral",
        "claim",
        "system"
    ],
    default: "system"
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

    suppressPush:{
        type:Boolean,
        default:false,
        select:false
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

notificationSchema.post("save", (notification) => {
  if (notification?.suppressPush) return;
  try {
    const { sendPushForNotification } = require("../services/pushService");
    void sendPushForNotification(notification).catch((error) => console.warn("Notification push delivery skipped:", error.message));
  } catch (error) {
    console.warn("Notification push service unavailable:", error.message);
  }
});

notificationSchema.post("insertMany", (notifications) => {
  try {
    const { sendPushForNotification } = require("../services/pushService");
    for (const notification of notifications || []) {
      void sendPushForNotification(notification).catch((error) => console.warn("Broadcast push delivery skipped:", error.message));
    }
  } catch (error) {
    console.warn("Broadcast push service unavailable:", error.message);
  }
});

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);
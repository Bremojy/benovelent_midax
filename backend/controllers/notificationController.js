const { notifyMembers } = require("../services/memberBroadcastService");
const Notification=require("../models/Notification");

/* =====================================================
GET MY NOTIFICATIONS
===================================================== */

exports.getNotifications=async(req,res)=>{

try{

const notifications=
await Notification.find({

recipient:req.user._id

})

.populate(

"sender",

"fullName profileImage"

)

.sort({

createdAt:-1

});

res.json({

success:true,

count:notifications.length,

notifications

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
UNREAD COUNT
===================================================== */

exports.getUnreadCount=async(req,res)=>{

try{

const unread=
await Notification.countDocuments({

recipient:req.user._id,

read:false

});

res.json({

success:true,

unread

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
MARK AS READ
===================================================== */

exports.markRead=async(req,res)=>{

try{

const notification=
await Notification.findById(req.params.id);

if(!notification){

return res.status(404).json({

success:false,

message:"Notification not found."

});

}

notification.read=true;

notification.readAt=new Date();

await notification.save();

res.json({

success:true,

notification

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
MARK ALL AS READ
===================================================== */

exports.markAllRead=async(req,res)=>{

try{

await Notification.updateMany(

{

recipient:req.user._id,

read:false

},

{

$set:{

read:true,

readAt:new Date()

}

}

);

res.json({

success:true,

message:"All notifications marked as read."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
CREATE NOTIFICATION
===================================================== */

exports.createNotification=async(req,res)=>{

try{

const notification=
await Notification.create(req.body);

res.status(201).json({

success:true,

notification

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
DELETE NOTIFICATION
===================================================== */

exports.deleteNotification=async(req,res)=>{

try{

const notification=
await Notification.findById(req.params.id);

if(!notification){

return res.status(404).json({

success:false,

message:"Notification not found."

});

}

await notification.deleteOne();

res.json({

success:true,

message:"Notification deleted."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
DELETE ALL MY NOTIFICATIONS
===================================================== */

exports.clearNotifications=async(req,res)=>{

try{

await Notification.deleteMany({

recipient:req.user._id

});

res.json({

success:true,

message:"Notifications cleared."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

// Route aliases
exports.markAsRead = exports.markRead;
exports.markAllAsRead = exports.markAllRead;

// Get single notification
exports.getNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id)
            .populate("sender", "fullName profileImage");

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        res.json({
            success: true,
            notification
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* =====================================================
BROADCAST TO MEMBERS
===================================================== */

exports.broadcastToMembers = async (req, res) => {
  try {
    const { title, message, smsText, emailHtml, broadcastSms = true } = req.body || {};

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    const result = await notifyMembers({
      subject: title.trim(),
      text: message.trim(),
      html: emailHtml || `<h2>${title.trim()}</h2><p>${message.trim().replace(/\n/g, "<br>")}</p>`,
      smsText: smsText || message.trim(),
      broadcastSms: Boolean(broadcastSms),
    });

    return res.status(201).json({
      success: true,
      message: "Broadcast sent successfully.",
      result,
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to broadcast message.",
    });
  }
};

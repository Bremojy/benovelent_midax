const { getIO } = require("../sockets/socket");
const { getChatActorId } = require("../utils/chatProfile");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

/* =====================================================
SEND MESSAGE
===================================================== */

exports.sendMessage = async (req, res) => {
    try {
        const actorId = getChatActorId(req);
        const {
            conversationId,
            message,
            text,
            messageType,
            attachment,
            image,
            replyTo,
        } = req.body;

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: "conversationId is required.",
            });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found.",
            });
        }

        const isParticipant = (conversation.participants || []).some((participant) => String(participant) === String(actorId));
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "You are not a participant in this conversation." });
        }

        const bodyText = String(message ?? text ?? "").trim();
        const bodyAttachment = String(attachment ?? image ?? "").trim();

        let inferredType = String(messageType || "").toLowerCase();

        if (!inferredType) {
            if (bodyAttachment) {
                if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(bodyAttachment)) {
                    inferredType = "video";
                } else if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(bodyAttachment)) {
                    inferredType = "audio";
                } else if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i.test(bodyAttachment)) {
                    inferredType = "document";
                } else {
                    inferredType = "image";
                }
            } else {
                inferredType = "text";
            }
        }

        const newMessage = await Message.create({
            conversation: conversationId,
            sender: actorId,
            message: bodyText,
            messageType: inferredType,
            attachment: bodyAttachment,
            replyTo: replyTo || undefined,
        });

        await newMessage.populate("sender", "fullName profileImage online lastSeen");
        await newMessage.populate("replyTo");

        conversation.lastMessage = newMessage._id;
        conversation.lastMessageText = bodyText || bodyAttachment || "New message";
        conversation.lastMessageSender = actorId;
        conversation.lastMessageTime = new Date();

        await conversation.save();

        const io = getIO();
        const recipients = (conversation.participants || [])
            .map((participant) => participant?.toString?.() || String(participant))
            .filter((participantId) => participantId && participantId !== String(actorId));

        if (io) {
            io.to(conversationId).emit("new-message", newMessage);
        }

        if (recipients.length) {
            const title = req.user?.fullName ? `New message from ${req.user.fullName}` : "New message received";
            const notificationMessage = bodyText || "You received a new attachment.";
            const senderModel = String(req.user?.role || "member")
                .toLowerCase()
                .replace(/^./, (char) => char.toUpperCase());
            const notificationTargets = await Promise.all(recipients.map(async (recipientId) => {
                const chatProfile = await Member.findById(recipientId).select("portalOwnerId portalOwnerRole role").lean();
                if (chatProfile?.portalOwnerId && chatProfile?.portalOwnerRole) {
                    return { recipient: chatProfile.portalOwnerId, recipientModel: chatProfile.portalOwnerRole === "admin" ? "Admin" : chatProfile.portalOwnerRole === "superadmin" ? "SuperAdmin" : "Member" };
                }
                if (chatProfile) return { recipient: recipientId, recipientModel: "Member" };
                const [admin, superadmin] = await Promise.all([
                    Admin.findById(recipientId).select("_id").lean(),
                    SuperAdmin.findById(recipientId).select("_id").lean(),
                ]);
                if (admin) return { recipient: recipientId, recipientModel: "Admin" };
                if (superadmin) return { recipient: recipientId, recipientModel: "SuperAdmin" };
                return { recipient: recipientId, recipientModel: "Member" };
            }));
            const notifications = await Notification.insertMany(
                notificationTargets.map((target) => ({
                    ...target,
                    sender: actorId,
                    senderModel,
                    title,
                    message: notificationMessage,
                    type: "message",
                    referenceId: newMessage._id,
                    referenceModel: "Message",
                    icon: "message-circle",
                }))
            );

            notifications.forEach((notification) => {
                io?.to(notification.recipient.toString()).emit("new-notification", notification);
            });
            await Promise.all(notificationTargets.filter((target) => target.recipientModel === "Member").map((target) => Member.findByIdAndUpdate(target.recipient, { $inc: { unreadMessages: 1, unreadNotifications: 1 } }).catch(() => null)));
        }

        return res.status(201).json({
            success: true,
            message: newMessage,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


/* =====================================================
GET CONVERSATION MESSAGES
===================================================== */

exports.getConversationMessages = async (req, res) => {

try{

const actorId = getChatActorId(req);

const messages=
await Message.find({

conversation:req.params.conversationId,

deletedFor:{
$ne:actorId
},

deletedForEveryone:false

})

.populate(

"sender",

"fullName profileImage"

)

.populate(

"replyTo"

)

.sort({

createdAt:1

});

res.json({

success:true,

count:messages.length,

messages

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
EDIT MESSAGE
===================================================== */

exports.editMessage=async(req,res)=>{

try{

const actorId = getChatActorId(req);

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=String(actorId)){

return res.status(403).json({

success:false,

message:"Unauthorized."

});

}

msg.message=req.body.message;

msg.edited=true;

msg.editedAt=new Date();

await msg.save();

res.json({

success:true,

message:msg

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
DELETE FOR ME
===================================================== */

exports.deleteMessage = async (req, res) => {

try{

const actorId = getChatActorId(req);

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.deletedFor.includes(actorId)){

msg.deletedFor.push(actorId);

}

await msg.save();

res.json({

success:true,

message:"Deleted for you."

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
DELETE FOR EVERYONE
===================================================== */

exports.deleteForEveryone=async(req,res)=>{

try{

const actorId = getChatActorId(req);

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=String(actorId)){

return res.status(403).json({

success:false,

message:"Unauthorized."

});

}

msg.deletedForEveryone=true;

await msg.save();

res.json({

success:true,

message:"Deleted."

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
MARK AS SEEN
===================================================== */
exports.markAsRead = async (req, res) => {

try{

const actorId = getChatActorId(req);

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.seenBy.includes(actorId)){

msg.seenBy.push(actorId);

msg.seenAt=new Date();

}

await msg.save();

res.json({

success:true

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
REACT TO MESSAGE
===================================================== */

exports.reactToMessage = async (req, res) => {

try{

const actorId = getChatActorId(req);

const {

emoji

}=req.body;

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

msg.reactions.push({

member:actorId,

emoji

});

await msg.save();

res.json({

success:true,

message:msg

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
GET SINGLE MESSAGE
===================================================== */

exports.getMessage = async (req, res) => {

    try {

        const message = await Message.findById(req.params.id)
            .populate("sender", "fullName profileImage")
            .populate("replyTo");

        if (!message) {

            return res.status(404).json({

                success: false,

                message: "Message not found."

            });

        }

        res.json({

            success: true,

            message

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/* =====================================================
UPLOAD MESSAGE ASSET
===================================================== */

exports.uploadMessageAsset = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a file.",
            });
        }

        const assetUrl = resolveStoredFileUrl(req.file, `/uploads/${req.uploadType || "messages"}`);

        return res.status(201).json({
            success: true,
            imageUrl: assetUrl,
            fileUrl: assetUrl,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

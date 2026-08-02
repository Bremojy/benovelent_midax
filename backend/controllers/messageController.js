const { getIO } = require("../sockets/socket");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

/* =====================================================
SEND MESSAGE
===================================================== */

exports.sendMessage = async (req, res) => {
    try {
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
            sender: req.user._id,
            message: bodyText,
            messageType: inferredType,
            attachment: bodyAttachment,
            replyTo: replyTo || undefined,
        });

        await newMessage.populate("sender", "fullName profileImage online lastSeen");
        await newMessage.populate("replyTo");

        conversation.lastMessage = newMessage._id;
        conversation.lastMessageText = bodyText || bodyAttachment || "New message";
        conversation.lastMessageSender = req.user._id;
        conversation.lastMessageTime = new Date();

        await conversation.save();

        const io = getIO();
        if (io) {
            io.to(conversationId).emit("new-message", newMessage);
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

const messages=
await Message.find({

conversation:req.params.conversationId,

deletedFor:{
$ne:req.user._id
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

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=req.user._id.toString()){

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

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.deletedFor.includes(req.user._id)){

msg.deletedFor.push(req.user._id);

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

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=req.user._id.toString()){

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

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.seenBy.includes(req.user._id)){

msg.seenBy.push(req.user._id);

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

member:req.user._id,

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

        const assetUrl = `/uploads/${req.uploadType || "messages"}/${req.file.filename}`;

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

const { getIO } = require("../sockets/socket");
const { getChatActorId } = require("../utils/chatProfile");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const mongoose = require("mongoose");

async function getAuthorizedDirectConversation(id, actorId) {
    if (!mongoose.isValidObjectId(id) || !actorId) return null;
    const conversation = await Conversation.findOne({
        _id: id,
        participants: actorId,
        isGroup: false,
        active: { $ne: false },
    }).lean();
    if (!conversation || !Array.isArray(conversation.participants) || conversation.participants.length !== 2) return null;

    const forbidden = await Member.exists({
        _id: { $in: conversation.participants },
        $or: [{ role: "superadmin" }, { portalOwnerRole: "superadmin" }],
    });
    if (forbidden) return null;
    return conversation;
}

async function getAuthorizedMessage(req) {
    const actorId = getChatActorId(req);
    if (!mongoose.isValidObjectId(req.params.id)) return { actorId, message: null, conversation: null };
    const message = await Message.findById(req.params.id);
    if (!message) return { actorId, message: null, conversation: null };
    const conversation = await getAuthorizedDirectConversation(message.conversation, actorId);
    return { actorId, message, conversation };
}

async function resolveNotificationTarget(chatId) {
    const id = String(chatId || "").trim();
    if (!id) return null;
    const chatProfile = await Member.findById(id).select("portalOwnerId portalOwnerRole role").lean();
    if (chatProfile?.portalOwnerId && chatProfile?.portalOwnerRole) {
        const role = String(chatProfile.portalOwnerRole).toLowerCase();
        const recipientModel = role === "admin" ? "Admin" : role === "member" ? "Member" : role === "superadmin" ? "SuperAdmin" : null;
        return recipientModel ? { recipient: chatProfile.portalOwnerId, recipientModel } : null;
    }
    if (chatProfile) return { recipient: chatProfile._id, recipientModel: "Member" };
    const admin = await Admin.findById(id).select("_id").lean();
    if (admin) return { recipient: admin._id, recipientModel: "Admin" };
    const superadmin = await SuperAdmin.findById(id).select("_id").lean();
    if (superadmin) return { recipient: superadmin._id, recipientModel: "SuperAdmin" };
    return null;
}

function portalSenderIdentity(req, actorId) {
    const role = String(req.user?.role || "member").toLowerCase();
    const senderModel = role === "admin" ? "Admin" : role === "superadmin" ? "SuperAdmin" : "Member";
    const sender = role === "admin" || role === "superadmin" ? req.user?._id : actorId;
    return { sender, senderModel };
}

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
        const clientMessageId = String(req.get("X-Idempotency-Key") || req.body?.clientMessageId || "").trim().slice(0, 100);

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: "conversationId is required.",
            });
        }

        const conversation = await getAuthorizedDirectConversation(conversationId, actorId);

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

        const bodyText = String(message ?? text ?? "").trim().slice(0, 5000);
        const bodyAttachment = String(attachment ?? image ?? "").trim().slice(0, 2000);
        if (!bodyText && !bodyAttachment) return res.status(400).json({ success: false, message: "Message or attachment is required." });

        let inferredType = String(messageType || "").toLowerCase();
        const allowedTypes = new Set(["text", "image", "video", "audio", "document"]);
        if (inferredType && !allowedTypes.has(inferredType)) return res.status(400).json({ success: false, message: "Unsupported message type." });

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

        if (replyTo) {
            if (!mongoose.isValidObjectId(replyTo)) return res.status(400).json({ success: false, message: "Invalid reply target." });
            const replyMessage = await Message.findOne({ _id: replyTo, conversation: conversationId });
            if (!replyMessage) return res.status(400).json({ success: false, message: "Reply target was not found in this conversation." });
        }

        let newMessage;
        try {
            newMessage = await Message.create({
                conversation: conversationId,
                sender: actorId,
                clientMessageId: clientMessageId || undefined,
                message: bodyText,
                messageType: inferredType,
                attachment: bodyAttachment,
                fileName: String(req.body?.fileName || "").trim().slice(0, 255),
                fileSize: Math.max(0, Number(req.body?.fileSize) || 0),
                mimeType: String(req.body?.mimeType || "").trim().slice(0, 160),
                replyTo: replyTo || undefined,
            });
        } catch (error) {
            if (error?.code === 11000 && clientMessageId) {
                newMessage = await Message.findOne({ conversation: conversationId, sender: actorId, clientMessageId });
                if (!newMessage) throw error;
                await newMessage.populate("sender", "fullName profileImage online lastSeen");
                await newMessage.populate("replyTo");
                return res.status(200).json({ success: true, duplicate: true, message: newMessage });
            }
            throw error;
        }

        await newMessage.populate("sender", "fullName profileImage online lastSeen");
        await newMessage.populate("replyTo");

        const unreadInc = {};
        for (const recipientId of (conversation.participants || [])
          .map((participant) => participant?.toString?.() || String(participant))
          .filter((participantId) => participantId && participantId !== String(actorId))) {
            unreadInc[`unreadCounts.${recipientId}`] = 1;
        }
        const updatedConversation = await Conversation.findOneAndUpdate(
            { _id: conversation._id, participants: actorId },
            { $set: { lastMessage: newMessage._id, lastMessageText: bodyText || bodyAttachment || "New message", lastMessageSender: actorId, lastMessageTime: new Date() }, ...(Object.keys(unreadInc).length ? { $inc: unreadInc } : {}) },
            { returnDocument: "after" }
        );
        if (!updatedConversation) return res.status(409).json({ success: false, message: "Conversation changed while sending the message. Please retry." });

        const io = getIO();
        const recipients = (conversation.participants || [])
            .map((participant) => participant?.toString?.() || String(participant))
            .filter((participantId) => participantId && participantId !== String(actorId));

        if (io) {
            io.to(String(conversationId)).emit("new-message", newMessage);
            recipients.forEach((recipientId) => io.to(String(recipientId)).emit("conversation-updated", {
                conversationId: String(conversationId),
                message: newMessage,
                unreadCount: Number(updatedConversation.unreadCounts?.get?.(recipientId) ?? updatedConversation.unreadCounts?.[recipientId] ?? 0),
            }));
        }

        if (recipients.length) {
            try {
                const title = req.user?.fullName ? `New message from ${req.user.fullName}` : "New message received";
                const notificationMessage = bodyText || "You received a new attachment.";
                const { sender, senderModel } = portalSenderIdentity(req, actorId);
                const notificationTargets = (await Promise.all(recipients.map(resolveNotificationTarget))).filter(Boolean);
                await Notification.insertMany(
                    notificationTargets.map((target) => ({
                        ...target,
                        sender,
                        senderModel,
                        title,
                        message: notificationMessage,
                        type: "message",
                        referenceId: newMessage._id,
                        referenceModel: "Message",
                        eventId: `message:${String(newMessage._id)}:${String(target.recipientModel)}:${String(target.recipient)}`,
                        metadata: { conversationId: String(conversation._id), messageId: String(newMessage._id) },
                        icon: "message-circle",
                    }))
                );

                          // Notification.create/insertMany owns realtime fanout and push
                          // delivery. Conversation.unreadCounts is the single source of
                          // truth for chat unread state; legacy Member unread counters are
                          // intentionally not modified here.
            } catch (notificationError) {
                console.warn("Message notification delivery failed after message persistence:", { messageId: String(newMessage._id), error: notificationError.message });
            }
        }
        return res.status(201).json({
            success: true,
            message: newMessage,
        });
    } catch (error) {
        console.error("Chat message send error:", { message: error.message, code: error.code || null });
        return res.status(error?.name === "ValidationError" ? 400 : error?.code === 11000 ? 409 : 500).json({
            success: false,
            message: error?.name === "ValidationError" ? "Message data is invalid." : error?.code === 11000 ? "That message has already been recorded." : "Unable to send the message right now.",
        });
    }
};


/* =====================================================
GET CONVERSATION MESSAGES
===================================================== */

exports.getConversationMessages = async (req, res) => {
    try {
        const actorId = getChatActorId(req);
        const conversationId = req.params.conversationId;
        const conversation = await getAuthorizedDirectConversation(conversationId, actorId);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });

        const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);
        const before = String(req.query?.before || "").trim();
        const filter = { conversation: conversationId, deletedFor: { $ne: actorId }, deletedForEveryone: false };
        if (before) {
            if (!mongoose.isValidObjectId(before)) return res.status(400).json({ success: false, message: "Invalid pagination cursor." });
            const cursor = await Message.findOne({ _id: before, conversation: conversationId }).select("createdAt _id").lean();
            if (!cursor) return res.status(400).json({ success: false, message: "Invalid pagination cursor." });
            filter.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }];
        }
        const rows = await Message.find(filter).populate("sender", "fullName profileImage").populate("replyTo").sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit).reverse();
        const nextCursor = hasMore ? String(page[0]?._id || "") : null;
        return res.json({ success: true, count: page.length, messages: page, hasMore, nextCursor });
    } catch (error) {
        console.error("Chat message history error:", { message: error.message });
        return res.status(500).json({ success: false, message: "Unable to load this conversation right now." });
    }
};


/* =====================================================
EDIT MESSAGE
===================================================== */

exports.editMessage=async(req,res)=>{
    try{
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        if(String(msg.sender)!==String(actorId)) return res.status(403).json({success:false,message:"Unauthorized."});
        if (msg.deletedForEveryone || String(msg.messageType || "") !== "text") return res.status(400).json({success:false,message:"Only active text messages can be edited."});
        const nextText = String(req.body.message || "").trim().slice(0,5000);
        if (!nextText) return res.status(400).json({success:false,message:"Edited message text is required."});
        msg.message=nextText;
        msg.edited=true; msg.editedAt=new Date(); await msg.save();
        getIO()?.to(String(msg.conversation)).emit("message-edited", msg);
        return res.json({success:true,message:msg});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to complete this chat operation right now."}); }
};


/* =====================================================
DELETE FOR ME/* =====================================================
DELETE FOR ME
===================================================== */

exports.deleteMessage = async (req, res) => {
    try{
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        if(!msg.deletedFor.includes(actorId)) msg.deletedFor.push(actorId);
        await msg.save();
        getIO()?.to(String(msg.conversation)).emit("message-deleted-for-me", {messageId:String(msg._id), userId:String(actorId)});
        return res.json({success:true,message:"Deleted for you."});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to complete this chat operation right now."}); }
};


/* =====================================================
DELETE FOR EVERYONE/* =====================================================
DELETE FOR EVERYONE
===================================================== */

exports.deleteForEveryone=async(req,res)=>{
    try{
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        if(String(msg.sender)!==String(actorId)) return res.status(403).json({success:false,message:"Unauthorized."});
        msg.deletedForEveryone=true; msg.message=""; msg.attachment=""; await msg.save();
        getIO()?.to(String(msg.conversation)).emit("message-deleted", {messageId:String(msg._id)});
        return res.json({success:true,message:"Deleted for everyone."});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to complete this chat operation right now."}); }
};


/* =====================================================
MARK AS SEEN/* =====================================================
MARK AS SEEN
===================================================== */
exports.markAsRead = async (req, res) => {
    try{
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        if(!(msg.seenBy || []).some((id) => String(id) === String(actorId))) msg.seenBy.push(actorId);
        msg.seenAt=new Date(); msg.delivered=true; msg.deliveredAt=msg.deliveredAt || new Date(); await msg.save();
        const updatedConversation = await Conversation.findOneAndUpdate(
            { _id: conversation._id, participants: actorId },
            { $set: { [`unreadCounts.${actorId}`]: 0 } },
            { new: true }
        );
        if(!updatedConversation) return res.status(403).json({success:false,message:"Conversation access denied"});
        getIO()?.to(String(msg.conversation)).emit("message-seen", {messageId:String(msg._id), userId:String(actorId), seenAt:msg.seenAt});
        return res.json({success:true,message:msg});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to complete this chat operation right now."}); }
};


/* =====================================================
REACT TO MESSAGE/* =====================================================
REACT TO MESSAGE
===================================================== */

exports.reactToMessage = async (req, res) => {
    try{
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        const emoji=String(req.body?.emoji || "").trim();
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        if(!emoji || emoji.length>20) return res.status(400).json({success:false,message:"Invalid reaction."});
        msg.reactions=(msg.reactions||[]).filter((reaction)=>String(reaction.member)!==String(actorId));
        msg.reactions.push({member:actorId,emoji});
        await msg.save();
        getIO()?.to(String(msg.conversation)).emit("message-reaction", msg);
        return res.json({success:true,message:msg});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to complete this chat operation right now."}); }
};


/* =====================================================
UNREACT TO MESSAGE
===================================================== */
exports.unreactToMessage = async (req, res) => {
    try {
        const { actorId, message: msg, conversation } = await getAuthorizedMessage(req);
        if(!msg || !conversation) return res.status(404).json({success:false,message:"Message not found."});
        msg.reactions = (msg.reactions || []).filter((reaction) => String(reaction.member) !== String(actorId));
        await msg.save();
        getIO()?.to(String(msg.conversation)).emit("message-reaction", msg);
        return res.json({success:true,message:msg});
    } catch(error){ return res.status(500).json({success:false,message:"Unable to update the reaction right now."}); }
};

/* =====================================================
SEARCH MESSAGES
===================================================== */
exports.searchConversationMessages = async (req, res) => {
    try {
        const actorId = getChatActorId(req);
        const conversationId = req.params.conversationId;
        if (!mongoose.isValidObjectId(conversationId)) return res.status(400).json({ success:false, message:"Invalid conversation." });
        const conversation = await Conversation.findOne({ _id: conversationId, participants: actorId, isGroup: false }).select("_id").lean();
        if (!conversation) return res.status(404).json({ success:false, message:"Conversation not found." });
        const query = String(req.query?.q || "").trim();
        if (!query) return res.json({ success:true, count:0, messages:[] });
        const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 100);
        const messages = await Message.find({
            conversation: conversationId,
            deletedFor: { $ne: actorId },
            deletedForEveryone: false,
            message: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
        }).populate("sender", "fullName profileImage").populate("replyTo").sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
        return res.json({ success:true, count:messages.length, messages });
    } catch(error){
        console.error("Chat message search error:", { message:error.message });
        return res.status(500).json({success:false,message:"Unable to search this conversation right now."});
    }
};

/* =====================================================
FORWARD MESSAGE
===================================================== */
exports.forwardMessage = async (req, res) => {
    try {
        const actorId = getChatActorId(req);
        const source = await Message.findById(req.params.id);
        if (!source) return res.status(404).json({success:false,message:"Message not found."});
        const sourceConversation = await getAuthorizedDirectConversation(source.conversation, actorId);
        if (!sourceConversation || source.deletedFor?.some?.((id) => String(id) === String(actorId)) || source.deletedForEveryone) {
            return res.status(404).json({success:false,message:"Message not found."});
        }

        const targetConversationId = String(req.body?.targetConversationId || "");
        if (!mongoose.isValidObjectId(targetConversationId)) return res.status(400).json({success:false,message:"A valid target conversation is required."});
        const targetConversation = await getAuthorizedDirectConversation(targetConversationId, actorId);
        if (!targetConversation) return res.status(403).json({success:false,message:"Target conversation access denied."});

        const clientMessageId = String(req.get("X-Idempotency-Key") || req.body?.clientMessageId || "").trim().slice(0,100);
        if (clientMessageId) {
            const duplicate = await Message.findOne({ conversation: targetConversationId, sender: actorId, clientMessageId });
            if (duplicate) {
                await duplicate.populate("sender", "fullName profileImage online lastSeen");
                await duplicate.populate("replyTo");
                return res.json({success:true,duplicate:true,message:duplicate});
            }
        }

        const forwarded = await Message.create({
            conversation: targetConversationId,
            sender: actorId,
            clientMessageId: clientMessageId || undefined,
            message: String(source.message || ""),
            messageType: source.messageType,
            attachment: String(source.attachment || ""),
            fileName: String(source.fileName || ""),
            fileSize: Number(source.fileSize || 0),
            mimeType: String(source.mimeType || ""),
            forwarded: true,
            forwardedFrom: source._id,
        });
        await forwarded.populate("sender", "fullName profileImage online lastSeen");
        await forwarded.populate("replyTo");

        const unreadKey = targetConversation.participants.map((id) => String(id)).find((id) => id !== String(actorId));
        const update = { $set: { lastMessage: forwarded._id, lastMessageText: forwarded.message || "Forwarded attachment", lastMessageSender: actorId, lastMessageTime: new Date() } };
        if (unreadKey) update.$inc = { [`unreadCounts.${unreadKey}`]: 1 };
        await Conversation.updateOne({ _id: targetConversation._id, participants: actorId }, update);
        const io = getIO();
        const targetRecipients = targetConversation.participants.map((id) => String(id)).filter((id) => id !== String(actorId));
        if (io) {
            io.to(String(targetConversation._id)).emit("new-message", forwarded);
            targetRecipients.forEach((recipientId) => io.to(String(recipientId)).emit("conversation-updated", { conversationId: String(targetConversation._id), message: forwarded }));
        }
        if (targetRecipients.length) {
            const { sender, senderModel } = portalSenderIdentity(req, actorId);
            const senderLabel = req.user?.fullName || "A contact";
            const targets = (await Promise.all(targetRecipients.map(resolveNotificationTarget))).filter(Boolean);
            await Notification.insertMany(targets.map((target) => ({
                ...target, sender, senderModel, title: `Forwarded message from ${senderLabel}`,
                message: String(forwarded.message || "You received a forwarded attachment."), type: "message",
                referenceId: forwarded._id, referenceModel: "Message",
                eventId: `message:${String(forwarded._id)}:${String(target.recipientModel)}:${String(target.recipient)}`,
                metadata: { conversationId: String(targetConversation._id), messageId: String(forwarded._id), forwarded: true },
                icon: "message-circle",
            })));
        }
        return res.status(201).json({success:true,message:forwarded});
    } catch(error){
        console.error("Chat forward error:", { message:error.message, code:error.code || null });
        return res.status(error?.code === 11000 ? 409 : 500).json({success:false,message:"Unable to forward the message right now."});
    }
};

/* =====================================================
GET SINGLE MESSAGE/* =====================================================
GET SINGLE MESSAGE
===================================================== */

exports.getMessage = async (req, res) => {

    try {

        const { message, conversation } = await getAuthorizedMessage(req);
        if (!message || !conversation) return res.status(404).json({ success:false, message:"Message not found." });
        await message.populate("sender", "fullName profileImage");
        await message.populate("replyTo");

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

            message: "Unable to load this message right now."

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
            fileName: req.file.originalname || "attachment",
            fileSize: Number(req.file.size || 0),
            mimeType: req.file.mimetype || "application/octet-stream",
        });
    } catch (error) {
        console.error("Chat attachment upload error:", { message: error.message });
        return res.status(500).json({
            success: false,
            message: "Unable to upload this attachment right now.",
        });
    }
};

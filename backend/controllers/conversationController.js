const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const { resolveChatActor, resolveCanonicalChatActorForAuthenticatedUser, getChatActorId, isChatRole } = require("../utils/chatProfile");

const getConversationPartnerIds = (conversation, currentUserId) => {
    const participantIds = Array.isArray(conversation?.participants)
        ? conversation.participants.map((participant) => String(participant?._id || participant)).filter(Boolean)
        : [];

    return participantIds.filter((id) => id !== String(currentUserId));
};

/* =====================================================
CREATE CONVERSATION
===================================================== */

exports.createConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        const me = req.auth?.chatId || req.user?.chatMemberId || req.user?._id;

        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: "participantId is required."
            });
        }

        if (!me) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const currentActor = await resolveCanonicalChatActorForAuthenticatedUser(req.user);
        const targetActor = await resolveChatActor(participantId);
        if (!currentActor || !isChatRole(currentActor.role) || !targetActor || !isChatRole(targetActor.role)) {
            return res.status(403).json({ success: false, message: "Only member and Admin chat identities are available in ordinary chat." });
        }

        if (!currentActor || !targetActor) {
            return res.status(404).json({
                success: false,
                message: "Selected chat participant could not be resolved."
            });
        }

        const canonicalMe = String(currentActor.chatId);
        const canonicalTarget = String(targetActor.chatId);
        const directKey = [canonicalMe, canonicalTarget].sort().join(":");

        if (canonicalMe === canonicalTarget) {
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with yourself."
            });
        }

        let conversation = await Conversation.findOne({ directKey, isGroup: false });

        if (conversation) {
            return res.json({
                success: true,
                conversation
            });
        }

        try {
            conversation = await Conversation.create({ participants: [canonicalMe, canonicalTarget], directKey, isGroup: false });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            conversation = await Conversation.findOne({ directKey, isGroup: false });
        }

        await conversation.populate(
            "participants",
            "fullName profileImage online lastSeen role portalOwnerRole"
        );

        return res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



/* =====================================================
GET MY CONVERSATIONS
===================================================== */

exports.getMyConversations=async(req,res)=>{


try{

const currentUserId = String(getChatActorId(req));

const conversations=await Conversation.find({

participants: currentUserId,

deletedFor: {$ne: currentUserId}

})

.populate(

"participants",

"fullName profileImage online lastSeen role portalOwnerRole"

)

.populate(

"lastMessage"

)

.sort({

updatedAt:-1

});

const visibleConversations = conversations.filter((conversation) => {
    const partnerIds = getConversationPartnerIds(conversation, currentUserId);
    if (!partnerIds.length) return false;
    return conversation.participants.some((participant) => {
        const id = String(participant?._id || participant);
        if (id === currentUserId) return true;
        const role = String(participant?.role || participant?.portalOwnerRole || "member").toLowerCase();
        return role === "member" || role === "admin";
    });
});

res.json({

success:true,

count:visibleConversations.length,

conversations: visibleConversations

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
GET SINGLE CONVERSATION
===================================================== */

exports.getConversation=async(req,res)=>{

try{

const conversation=await Conversation.findById(

req.params.id

)

const currentUserId = req.auth?.chatId || req.user._id;
if (!conversation || !(conversation.participants || []).some((participant) => String(participant) === String(currentUserId))) {
    return res.status(404).json({ success:false, message:"Conversation not found." });
}

await conversation.populate("participants", "fullName profileImage online lastSeen role portalOwnerRole");
const hasForbiddenPartner = conversation.participants.some((participant) => {
    const role = String(participant?.role || participant?.portalOwnerRole || "").toLowerCase();
    return role === "superadmin" || role === "super_admin";
});
if (hasForbiddenPartner) {
    return res.status(403).json({ success:false, message:"SuperAdmin is not available as a chat participant." });
}

await conversation.populate(

"participants",

"fullName profileImage online lastSeen role portalOwnerRole"

);

await conversation.populate("lastMessage");

res.json({

success:true,

conversation

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
MARK CONVERSATION READ
===================================================== */
exports.markConversationRead = async (req, res) => {
    try {
        const actorId = req.auth?.chatId || req.user._id;
        const conversation = await Conversation.findOne({ _id: req.params.id, participants: actorId });
        if (!conversation) return res.status(404).json({ success:false, message:"Conversation not found." });
        conversation.unreadCounts = conversation.unreadCounts || new Map();
        conversation.unreadCounts.set(String(actorId), 0);
        await conversation.save();
        const Message = require("../models/Message");
        await Message.updateMany({ conversation: conversation._id, sender: { $ne: actorId }, seenBy: { $ne: actorId }, deletedForEveryone: false }, { $addToSet: { seenBy: actorId }, $set: { seenAt: new Date(), delivered: true, deliveredAt: new Date() } });
        return res.json({ success:true });
    } catch (error) {
        return res.status(500).json({ success:false, message:error.message });
    }
};

/* =====================================================
DELETE CONVERSATION FOR ME
===================================================== */

exports.deleteConversation=async(req,res)=>{

try{

const actorId = String(getChatActorId(req));
const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.deletedFor.includes(actorId)){

conversation.deletedFor.push(actorId);

}

await conversation.save();

res.json({

success:true,

message:"Conversation removed."

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
PIN CONVERSATION
===================================================== */

exports.pinConversation=async(req,res)=>{

try{

const actorId = req.auth?.chatId || req.user?.chatMemberId || req.user?._id;

const conversation = await Conversation.findOne({ _id: req.params.id, participants: actorId, active: { $ne: false } });

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.pinnedBy.includes(actorId)){

conversation.pinnedBy.push(actorId);

}

await conversation.save();

res.json({

success:true,

message:"Conversation pinned."

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
MUTE CONVERSATION
===================================================== */

exports.muteConversation=async(req,res)=>{

try{

const actorId = req.auth?.chatId || req.user?.chatMemberId || req.user?._id;

const conversation = await Conversation.findOne({ _id: req.params.id, participants: actorId, active: { $ne: false } });

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.mutedBy.includes(actorId)){

conversation.mutedBy.push(actorId);

}

await conversation.save();

res.json({

success:true,

message:"Conversation muted."

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

exports.addMember = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        const actorId = String(getChatActorId(req));
        if (!conversation.participants.some((id) => String(id) === actorId)) return res.status(403).json({ success: false, message: "You are not a participant in this conversation." });
        if (!conversation.isGroup) return res.status(400).json({ success: false, message: "Direct conversations cannot have participants added." });
        const { memberId } = req.body;

        if (!memberId) {
            return res.status(400).json({
                success: false,
                message: "memberId is required."
            });
        }

        if (!conversation.participants.includes(memberId)) {
            conversation.participants.push(memberId);
            await conversation.save();
        }

        res.json({
            success: true,
            message: "Member added successfully.",
            conversation
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        const actorId = String(getChatActorId(req));
        if (!conversation.participants.some((id) => String(id) === actorId)) return res.status(403).json({ success: false, message: "You are not a participant in this conversation." });
        if (!conversation.isGroup) return res.status(400).json({ success: false, message: "Direct conversations cannot remove participants." });
        const { memberId } = req.body;

        conversation.participants = conversation.participants.filter(
            id => id.toString() !== memberId
        );

        await conversation.save();

        res.json({
            success: true,
            message: "Member removed successfully.",
            conversation
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
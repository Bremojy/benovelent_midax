const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const { ensureChatProfile } = require("../utils/chatProfile");
const redisCache = require("../services/redisCache");

const resolveChatActor = async (id) => {
    const chatId = String(id || "").trim();
    if (!chatId) return null;

    const member = await Member.findById(chatId).lean();
    if (member) {
        return { id: String(member._id), role: String(member.role || "member").toLowerCase(), user: member };
    }

    const admin = await Admin.findById(chatId).lean();
    if (admin) {
        const profile = await ensureChatProfile(admin);
        return profile ? { id: String(profile._id), role: "admin", user: profile, portalUser: admin } : null;
    }

    const superAdmin = await SuperAdmin.findById(chatId).lean();
    if (superAdmin) {
        const profile = await ensureChatProfile(superAdmin);
        return profile ? { id: String(profile._id), role: "superadmin", user: profile, portalUser: superAdmin } : null;
    }

    return null;
};

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

        const currentActor = await resolveChatActor(me);
        const targetActor = await resolveChatActor(participantId);

        if (!currentActor || !targetActor) {
            return res.status(404).json({
                success: false,
                message: "Selected chat participant could not be resolved."
            });
        }

        const canonicalMe = String(currentActor.id);
        const canonicalTarget = String(targetActor.id);

        if (canonicalMe === canonicalTarget) {
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with yourself."
            });
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [canonicalMe, canonicalTarget] },
            isGroup: false
        });

        if (conversation) {
            return res.json({
                success: true,
                conversation
            });
        }

        conversation = await Conversation.create({
            participants: [canonicalMe, canonicalTarget]
        });

        await conversation.populate(
            "participants",
            "fullName profileImage online lastSeen"
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
    const cacheKey = `chat:${req.auth?.chatId || req.user._id}:conversations`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 10).catch(() => {}); return __originalJson(body); };


try{

const currentUserId = req.auth?.chatId || req.user._id;

const conversations=await Conversation.find({

participants: currentUserId,

deletedFor: {$ne: currentUserId}

})

.populate(

"participants",

"fullName profileImage online lastSeen"

)

.populate(

"lastMessage"

)

.sort({

updatedAt:-1

});

const visibleConversations = conversations.filter((conversation) => {
    const partnerIds = getConversationPartnerIds(conversation, currentUserId);
    return partnerIds.length > 0 && partnerIds.some((id) => String(id) !== String(currentUserId));
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

await conversation.populate(

"participants",

"fullName profileImage online lastSeen"

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

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.deletedFor.includes(req.user._id)){

conversation.deletedFor.push(req.user._id);

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

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.pinnedBy.includes(req.user._id)){

conversation.pinnedBy.push(req.user._id);

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

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.mutedBy.includes(req.user._id)){

conversation.mutedBy.push(req.user._id);

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
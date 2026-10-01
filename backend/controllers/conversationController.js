const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const { resolveChatActor, resolveCanonicalChatActorForAuthenticatedUser, getChatActorId, isChatRole } = require("../utils/chatProfile");


const DIRECT_CONVERSATION_POPULATE = "fullName profileImage online lastSeen role portalOwnerRole status isDeleted portalOwnerId";

async function getAuthorizedDirectConversation(id, actorId) {
    if (!id || !actorId) return null;
    const conversation = await Conversation.findOne({
        _id: id,
        $and: [
            { participants: actorId },
            { participants: { $size: 2 } },
        ],
        isGroup: false,
        active: true,
        deletedFor: { $ne: actorId },
    });
    if (!conversation) return null;
    await conversation.populate("participants", DIRECT_CONVERSATION_POPULATE);
    const participantRoles = conversation.participants.map((participant) =>
        String(participant?.role || participant?.portalOwnerRole || "").toLowerCase()
    );
    const participantStates = conversation.participants.map((participant) => ({
        role: String(participant?.role || participant?.portalOwnerRole || "").toLowerCase(),
        status: String(participant?.status || "active").toLowerCase(),
        deleted: participant?.isDeleted === true,
    }));
    if (participantRoles.some((role) => role === "superadmin" || role === "super_admin" || !["member", "admin"].includes(role))) return null;
    if (participantStates.some((state) => state.deleted || state.status !== "active")) return null;
    return conversation;
}

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

        const targetStatus = String(targetActor.user?.status || "active").toLowerCase();
        if (targetActor.user?.isDeleted === true || targetStatus !== "active") {
            return res.status(403).json({ success: false, message: "That chat participant is not active." });
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

        // Legacy rows may have missing directKey values. Reuse the newest exact
        // two-party row instead of creating a duplicate thread.
        if (!conversation) {
            conversation = await Conversation.findOne({
                $and: [
                    { participants: { $all: [canonicalMe, canonicalTarget] } },
                    { participants: { $size: 2 } },
                ],
                isGroup: false,
            }).sort({ updatedAt: -1, _id: -1 });
            if (conversation) conversation.directKey = directKey;
        }

        if (conversation) {
            // Re-opening a direct chat restores this viewer only and makes the
            // canonical thread active again. The other viewer's state is preserved.
            conversation.active = true;
            conversation.deletedFor = (conversation.deletedFor || []).filter((id) => String(id) !== canonicalMe);
            if (conversation.archivedBy?.some?.((id) => String(id) === canonicalMe)) {
                conversation.archivedBy = conversation.archivedBy.filter((id) => String(id) !== canonicalMe);
            }
            try {
                await conversation.save();
            } catch (error) {
                if (error?.code !== 11000) throw error;
                const canonical = await Conversation.findOne({ directKey, isGroup: false });
                if (canonical) conversation = canonical;
            }
            await conversation.populate(
                "participants",
                DIRECT_CONVERSATION_POPULATE
            );
            await conversation.populate("lastMessage");
            return res.json({
                success: true,
                conversation
            });
        }

        try {
            conversation = await Conversation.create({ participants: [canonicalMe, canonicalTarget], directKey, isGroup: false, active: true });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            conversation = await Conversation.findOne({ directKey, isGroup: false });
        }

        await conversation.populate(
            "participants",
            DIRECT_CONVERSATION_POPULATE
        );

        return res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Unable to complete this conversation operation right now."
        });
    }
};



/* =====================================================
GET MY CONVERSATIONS
===================================================== */

exports.getMyConversations = async (req, res) => {
    try {
        const currentUserId = String(getChatActorId(req));
        const conversations = await Conversation.find({
            $and: [
                { participants: currentUserId },
                { participants: { $size: 2 } },
            ],
            isGroup: false,
            active: true,
            deletedFor: { $ne: currentUserId },
        })
            .populate("participants", DIRECT_CONVERSATION_POPULATE)
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        const visibleConversations = conversations.filter((conversation) => {
            if (conversation.isGroup || (conversation.participants || []).length !== 2) return false;
            const participantRoles = conversation.participants.map((participant) =>
                String(participant?.role || participant?.portalOwnerRole || "").toLowerCase()
            );
            if (participantRoles.some((role) => role === "superadmin" || role === "super_admin" || !["member", "admin"].includes(role))) return false;
            if (conversation.participants.some((participant) => participant?.isDeleted === true || String(participant?.status || "active").toLowerCase() !== "active")) return false;
            const partnerIds = getConversationPartnerIds(conversation, currentUserId);
            return partnerIds.length === 1;
        });

        return res.json({
            success: true,
            count: visibleConversations.length,
            conversations: visibleConversations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to complete this conversation operation right now.",
        });
    }
};


/* =====================================================
GET SINGLE CONVERSATION
===================================================== */

exports.getConversation = async (req, res) => {
    try {
        const actorId = String(getChatActorId(req));
        const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
        await conversation.populate("lastMessage");
        return res.json({ success: true, conversation });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to complete this conversation operation right now.",
        });
    }
};


/* =====================================================
MARK CONVERSATION READ
===================================================== */
exports.markConversationRead = async (req, res) => {
    try {
        const actorId = String(getChatActorId(req));
        const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);
        if (!conversation) return res.status(404).json({ success:false, message:"Conversation not found." });
        conversation.unreadCounts = conversation.unreadCounts || new Map();
        conversation.unreadCounts.set(String(actorId), 0);
        await conversation.save();
        const Message = require("../models/Message");
        await Message.updateMany({ conversation: conversation._id, sender: { $ne: actorId }, seenBy: { $ne: actorId }, deletedForEveryone: false }, { $addToSet: { seenBy: actorId }, $set: { seenAt: new Date(), delivered: true, deliveredAt: new Date() } });
        return res.json({ success:true });
    } catch (error) {
        return res.status(500).json({ success:false, message:"Unable to complete this conversation operation right now." });
    }
};

/* =====================================================
DELETE CONVERSATION FOR ME
===================================================== */

exports.deleteConversation=async(req,res)=>{

try{

const actorId = String(getChatActorId(req));
const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.deletedFor.some((id) => String(id) === actorId)){

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

message:"Unable to complete this conversation operation right now."

});

}

};



/* =====================================================
PIN CONVERSATION
===================================================== */

exports.pinConversation=async(req,res)=>{

try{

const actorId = String(getChatActorId(req));

const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(conversation.pinnedBy.some((id) => String(id) === actorId)){
conversation.pinnedBy = conversation.pinnedBy.filter((id) => String(id) !== actorId);
} else {
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

message:"Unable to complete this conversation operation right now."

});

}

};



/* =====================================================
MUTE CONVERSATION
===================================================== */

exports.muteConversation=async(req,res)=>{

try{

const actorId = String(getChatActorId(req));

const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(conversation.mutedBy.some((id) => String(id) === actorId)){
conversation.mutedBy = conversation.mutedBy.filter((id) => String(id) !== actorId);
} else {
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

message:"Unable to complete this conversation operation right now."

});

}

};

/* =====================================================
ARCHIVE / UNARCHIVE CONVERSATION
===================================================== */
exports.archiveConversation = async (req, res) => {
    try {
        const actorId = String(getChatActorId(req));
        const conversation = await getAuthorizedDirectConversation(req.params.id, actorId);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });

        const archived = conversation.archivedBy.some((id) => String(id) === actorId);
        if (archived) {
            conversation.archivedBy = conversation.archivedBy.filter((id) => String(id) !== actorId);
        } else {
            conversation.archivedBy.push(actorId);
        }
        await conversation.save();
        return res.json({ success: true, archived: !archived, conversation });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to update archive state." });
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
            message: "Unable to complete this conversation operation right now."
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
            message: "Unable to complete this conversation operation right now."
        });
    }
};

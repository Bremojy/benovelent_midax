const mongoose = require("mongoose");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Carousel = require("../models/Carousel");
const Dependent = require("../models/Dependent");
const Contribution = require("../models/Contribution");
const EducationSupport = require("../models/EducationSupport");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const Finance = require("../models/Finance");
const SupportRequest = require("../models/SupportRequest");
const Vote = require("../models/Vote");
const News = require("../models/News");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");

const normalize = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

const normalizePhone = (value) =>
    String(value || "").replace(/\D/g, "");

const identityKeys = (record) => {
    const keys = [];
    const email = normalize(record.email);
    const username = normalize(record.username);
    const memberNumber = normalize(record.memberNumber);
    const phone = normalizePhone(record.phone);

    if (email) keys.push(`email:${email}`);
    if (username) keys.push(`username:${username}`);
    if (memberNumber) keys.push(`memberNumber:${memberNumber}`);
    // Phone is a fallback identity only when stronger identifiers are absent;
    // shared family/office numbers must not merge two real accounts.
    if (!email && !username && !memberNumber && phone && phone.length >= 9) {
        keys.push(`phone:${phone}`);
    }
    return keys;
};

function findDuplicateGroups(records) {
    const groups = new Map();
    const recordById = new Map(records.map((record) => [String(record._id), record]));

    for (const record of records) {
        for (const key of identityKeys(record)) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(String(record._id));
        }
    }

    // Union overlapping identity keys so email/phone/username collisions
    // are reported as one identity group rather than separate duplicates.
    const parent = new Map();
    const find = (id) => {
        let p = parent.get(id) || id;
        while (parent.get(p) && parent.get(p) !== p) p = parent.get(p);
        parent.set(id, p);
        return p;
    };
    const union = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
    };

    for (const ids of groups.values()) {
        ids.forEach((id) => find(id));
        for (let i = 1; i < ids.length; i += 1) union(ids[0], ids[i]);
    }

    const clusters = new Map();
    for (const id of parent.keys()) {
        const root = find(id);
        if (!clusters.has(root)) clusters.set(root, []);
        clusters.get(root).push(recordById.get(id));
    }

    return Array.from(clusters.values())
        .filter((cluster) => cluster.length > 1)
        .map((cluster) => cluster.map((record) => ({
            id: String(record._id),
            name: record.fullName || record.name || record.email || "Unnamed",
            email: record.email || "",
            username: record.username || "",
            memberNumber: record.memberNumber || "",
            phone: record.phone || "",
            status: record.status || "active",
            updatedAt: record.updatedAt || record.createdAt || null,
            profileCompletion: Number(record.profileCompletion || 0),
        })));
}

const chooseCanonical = (records) => [...records].sort((a, b) => {
    const activeA = String(a.status || "") === "active" ? 1 : 0;
    const activeB = String(b.status || "") === "active" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;

    const completionA = Number(a.profileCompletion || 0);
    const completionB = Number(b.profileCompletion || 0);
    if (completionA !== completionB) return completionB - completionA;

    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
});

async function buildReport() {
    const [members, admins, superadmins, conversations, messages, carousels] = await Promise.all([
        Member.find({ isDeleted: { $ne: true }, status: { $ne: "inactive" } }).select("fullName name email username memberNumber phone status isDeleted profileCompletion createdAt updatedAt").lean(),
        Admin.find({ status: { $nin: ["inactive", "deleted"] } }).select("fullName name email username memberNumber phone status deletedAt createdAt updatedAt").lean(),
        SuperAdmin.find({ status: { $nin: ["inactive", "deleted"] } }).select("fullName name email username memberNumber phone status createdAt updatedAt").lean(),
        Conversation.find({}).select("_id participants active updatedAt createdAt lastMessage").lean(),
        Message.find({}).select("_id conversation sender createdAt").lean(),
        Carousel.find({}).select("_id imageUrl title description isActive order createdAt updatedAt").lean(),
    ]);

    const memberDuplicates = findDuplicateGroups(members);
    const adminDuplicates = findDuplicateGroups(admins);

    const allAccounts = [
        ...members.map((x) => ({ ...x, model: "Member" })),
        ...admins.map((x) => ({ ...x, model: "Admin" })),
        ...superadmins.map((x) => ({ ...x, model: "SuperAdmin" })),
    ];

    const accountIds = new Set(allAccounts.map((x) => String(x._id)));
    const orphanConversations = conversations.filter((conversation) =>
        (conversation.participants || []).some((id) => !accountIds.has(String(id)))
    );

    const conversationIds = new Set(conversations.map((x) => String(x._id)));
    const orphanMessages = messages.filter((message) => !conversationIds.has(String(message.conversation)));

    const conversationGroups = new Map();
    conversations
        .filter((conversation) => Array.isArray(conversation.participants) && conversation.participants.length === 2)
        .forEach((conversation) => {
            const ids = conversation.participants.map(String).sort();
            const key = ids.join(":");
            if (!conversationGroups.has(key)) conversationGroups.set(key, []);
            conversationGroups.get(key).push(conversation);
        });

    const duplicateConversations = Array.from(conversationGroups.values())
        .filter((group) => group.length > 1)
        .map((group) => {
            const ordered = [...group].sort((a, b) =>
                new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
            );
            return {
                keep: String(ordered[0]._id),
                remove: ordered.slice(1).map((x) => String(x._id)),
                participants: ordered[0].participants.map(String),
            };
        });

    const carouselGroups = new Map();
    carousels.forEach((slide) => {
        const key = [
            normalize(slide.imageUrl),
            normalize(slide.title),
            normalize(slide.description),
        ].join("|");
        if (!carouselGroups.has(key)) carouselGroups.set(key, []);
        carouselGroups.get(key).push(slide);
    });

    const duplicateCarousels = Array.from(carouselGroups.values())
        .filter((group) => group.length > 1)
        .map((group) => {
            const ordered = [...group].sort((a, b) =>
                new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
            );
            return {
                keep: String(ordered[0]._id),
                remove: ordered.slice(1).map((x) => String(x._id)),
                title: ordered[0].title,
            };
        });

    // Cross-collection collisions are reported, but never auto-deleted because
    // a person may legitimately have both a member and an administrator role.
    const crossCollection = new Map();
    allAccounts.forEach((account) => {
        identityKeys(account).forEach((key) => {
            if (!crossCollection.has(key)) crossCollection.set(key, []);
            crossCollection.get(key).push({
                id: String(account._id),
                model: account.model,
                name: account.fullName || account.name || account.email || "Unnamed",
                email: account.email || "",
            });
        });
    });

    const identityCollisions = Array.from(crossCollection.values())
        .filter((group) => new Set(group.map((x) => x.model)).size > 1)
        .filter((group) => new Set(group.map((x) => x.id)).size > 1)
        .slice(0, 200);

    const preview = (groups) => groups.slice(0, 100).map((group) => {
        const canonical = chooseCanonical(group);
        return {
            keep: String(canonical[0]?._id || canonical[0]?.id),
            records: group.map((item) => ({
                id: String(item._id || item.id),
                name: item.fullName || item.name || item.email || "Unnamed",
                email: item.email || "",
                status: item.status || "active",
            })),
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        counts: {
            members: members.length - memberDuplicates.reduce((sum, group) => sum + Math.max(0, group.length - 1), 0),
            liveMemberRecords: members.length,
            admins: admins.length,
            superadmins: superadmins.length,
            conversations: conversations.length,
            messages: messages.length,
            carousels: carousels.length,
            duplicateMemberGroups: memberDuplicates.length,
            duplicateAdminGroups: adminDuplicates.length,
            duplicateConversationGroups: duplicateConversations.length,
            orphanConversations: orphanConversations.length,
            orphanMessages: orphanMessages.length,
            duplicateCarouselGroups: duplicateCarousels.length,
            crossCollectionIdentityCollisions: identityCollisions.length,
        },
        duplicateMembers: preview(memberDuplicates),
        duplicateAdmins: preview(adminDuplicates),
        duplicateConversations,
        orphanConversations: orphanConversations.slice(0, 100).map((x) => ({
            id: String(x._id),
            participants: (x.participants || []).map(String),
        })),
        orphanMessages: orphanMessages.slice(0, 100).map((x) => ({
            id: String(x._id),
            conversation: String(x.conversation),
            sender: String(x.sender),
        })),
        duplicateCarousels,
        identityCollisions,
    };
}

async function archiveDuplicateMembers(userId) {
    const members = await Member.find({ isDeleted: { $ne: true }, status: { $ne: "inactive" } }).select("fullName name email username memberNumber phone status isDeleted profileCompletion createdAt updatedAt").lean();
    const groups = findDuplicateGroups(members);
    let archived = 0;

    for (const group of groups) {
        const ordered = chooseCanonical(group);
        const keep = ordered[0];
        for (const duplicate of ordered.slice(1)) {
            // Do not hard-delete records: preserve financial/support/audit references.
            const result = await Member.updateOne(
                { _id: duplicate._id },
                {
                    $set: {
                        isDeleted: true,
                        status: "inactive",
                        deletedBy: userId,
                    },
                }
            );
            archived += result.modifiedCount || 0;
        }
        void keep;
    }
    return archived;
}

async function archiveDuplicateAdmins(userId) {
    const admins = await Admin.find({ status: { $nin: ["inactive", "deleted"] } }).select("fullName name email phone status deletedAt createdAt updatedAt").lean();
    const groups = findDuplicateGroups(admins);
    let archived = 0;

    for (const group of groups) {
        const ordered = chooseCanonical(group);
        for (const duplicate of ordered.slice(1)) {
            const result = await Admin.updateOne(
                { _id: duplicate._id },
                {
                    $set: {
                        status: "inactive",
                        deletedAt: new Date(),
                        deletedBy: userId,
                    },
                }
            );
            archived += result.modifiedCount || 0;
        }
    }
    return archived;
}

async function mergeDuplicateConversations() {
    const conversations = await Conversation.find({ isGroup: false }).select("_id participants updatedAt createdAt lastMessage lastMessageText lastMessageSender lastMessageTime").lean();
    const groups = new Map();

    conversations.forEach((conversation) => {
        if (!Array.isArray(conversation.participants) || conversation.participants.length !== 2) return;
        const key = conversation.participants.map(String).sort().join(":");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(conversation);
    });

    let merged = 0;
    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const ordered = [...group].sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
        );
        const canonical = ordered[0];

        for (const duplicate of ordered.slice(1)) {
            await Message.updateMany(
                { conversation: duplicate._id },
                { $set: { conversation: canonical._id } }
            );

            if (!canonical.lastMessage && duplicate.lastMessage) {
                await Conversation.updateOne(
                    { _id: canonical._id },
                    {
                        $set: {
                            lastMessage: duplicate.lastMessage,
                            lastMessageText: duplicate.lastMessageText || "",
                            lastMessageSender: duplicate.lastMessageSender || null,
                            lastMessageTime: duplicate.lastMessageTime || duplicate.updatedAt || new Date(),
                        },
                    }
                );
            }

            await Conversation.deleteOne({ _id: duplicate._id });
            merged += 1;
        }
    }
    return merged;
}

async function removeOrphans() {
    const [members, admins, superadmins, conversations] = await Promise.all([
        Member.find({ isDeleted: { $ne: true }, status: { $ne: "inactive" } }).select("_id").lean(),
        Admin.find({ status: { $nin: ["inactive", "deleted"] } }).select("_id").lean(),
        SuperAdmin.find({ status: { $nin: ["inactive", "deleted"] } }).select("_id").lean(),
        Conversation.find({}).select("_id participants").lean(),
    ]);

    const accountIds = new Set([
        ...members.map((x) => String(x._id)),
        ...admins.map((x) => String(x._id)),
        ...superadmins.map((x) => String(x._id)),
    ]);

    const orphans = conversations.filter((conversation) =>
        (conversation.participants || []).some((id) => !accountIds.has(String(id)))
    );

    let removedConversations = 0;
    let removedMessages = 0;
    for (const conversation of orphans) {
        const result = await Message.deleteMany({ conversation: conversation._id });
        removedMessages += result.deletedCount || 0;
        const deleted = await Conversation.deleteOne({ _id: conversation._id });
        removedConversations += deleted.deletedCount || 0;
    }

    const danglingMessages = await Message.find({}).select("_id conversation").lean();
    const validConversationIds = new Set(
        (await Conversation.find({}).select("_id").lean()).map((x) => String(x._id))
    );
    const messageIds = danglingMessages
        .filter((message) => !validConversationIds.has(String(message.conversation)))
        .map((message) => message._id);

    if (messageIds.length) {
        const result = await Message.deleteMany({ _id: { $in: messageIds } });
        removedMessages += result.deletedCount || 0;
    }

    return { removedConversations, removedMessages };
}

async function removeDuplicateCarousels() {
    const slides = await Carousel.find({}).select("_id imageUrl title description createdAt updatedAt").lean();
    const groups = new Map();

    slides.forEach((slide) => {
        const key = [normalize(slide.imageUrl), normalize(slide.title), normalize(slide.description)].join("|");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(slide);
    });

    let removed = 0;
    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const ordered = [...group].sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
        );
        const ids = ordered.slice(1).map((x) => x._id);
        if (ids.length) {
            const result = await Carousel.deleteMany({ _id: { $in: ids } });
            removed += result.deletedCount || 0;
        }
    }
    return removed;
}

async function findMemberReferences(memberId) {
    const id = new mongoose.Types.ObjectId(memberId);
    const checks = [
        [Dependent, { member: id }, "dependents"],
        [Contribution, { member: id }, "contributions"],
        [EducationSupport, { member: id }, "education support"],
        [MedicalSupport, { member: id }, "medical support"],
        [FuneralSupport, { member: id }, "funeral support"],
        [Finance, { member: id }, "finance records"],
        [SupportRequest, { member: id }, "support requests"],
        [Vote, { member: id }, "votes"],
        [News, { author: id }, "news posts"],
        [AuditLog, { user: id }, "audit logs"],
        [Notification, { recipient: id }, "notifications"],
        [Conversation, { participants: id }, "conversations"],
        [Message, { $or: [{ member: id }, { sender: id }, { recipient: id }] }, "messages"],
    ];

    const references = [];
    for (const [Model, query, label] of checks) {
        try {
            const count = await Model.countDocuments(query);
            if (count) references.push({ label, count });
        } catch (error) {
            // Schemas vary between modules; a missing field simply means no reference.
        }
    }
    return references;
}

exports.deleteDuplicateMember = async (req, res) => {
    try {
        const id = String(req.params.id || "").trim();
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid member ID." });
        }

        const members = await Member.find({ isDeleted: { $ne: true }, status: { $ne: "inactive" } })
            .select("fullName name email username memberNumber phone status profileCompletion createdAt updatedAt")
            .lean();
        const groups = findDuplicateGroups(members);
        const group = groups.find((items) => items.some((item) => String(item._id) === id));
        if (!group) {
            return res.status(404).json({ success: false, message: "This member is not currently identified as a duplicate." });
        }

        const canonical = chooseCanonical(group)[0];
        if (String(canonical._id) === id) {
            return res.status(400).json({ success: false, message: "The canonical member record cannot be deleted from this screen." });
        }

        const references = await findMemberReferences(id);
        if (references.length) {
            return res.status(409).json({
                success: false,
                code: "DUPLICATE_HAS_REFERENCES",
                message: "This duplicate is linked to existing records, so it was not hard-deleted. Use Safe Cleanup to archive it instead.",
                references,
            });
        }

        const deleted = await Member.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "Member record not found." });

        const report = await buildReport();
        return res.json({ success: true, message: "Duplicate member deleted permanently.", report });
    } catch (error) {
        console.error("Delete duplicate member error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to delete duplicate member." });
    }
};

exports.getIntegrityReport = async (req, res) => {
    try {
        const report = await buildReport();
        res.set("Cache-Control", "no-store");
        res.json({ success: true, report });
    } catch (error) {
        console.error("Data integrity report error:", error);
        res.status(500).json({ success: false, message: error.message || "Unable to inspect database integrity." });
    }
};

exports.runSafeCleanup = async (req, res) => {
    try {
        const requested = String(req.body?.scope || "safe").toLowerCase();
        const result = {};

        if (requested === "members" || requested === "safe" || requested === "all") {
            result.archivedDuplicateMembers = await archiveDuplicateMembers(req.user._id);
        }
        if (requested === "admins" || requested === "safe" || requested === "all") {
            result.archivedDuplicateAdmins = await archiveDuplicateAdmins(req.user._id);
        }
        if (requested === "conversations" || requested === "safe" || requested === "all") {
            result.mergedDuplicateConversations = await mergeDuplicateConversations();
            result.orphans = await removeOrphans();
        }
        if (requested === "carousel" || requested === "safe" || requested === "all") {
            result.removedDuplicateCarousels = await removeDuplicateCarousels();
        }

        const report = await buildReport();
        res.set("Cache-Control", "no-store");
        res.json({
            success: true,
            message: "Safe cleanup completed. Financial/support records were preserved; duplicate accounts were archived rather than hard-deleted.",
            result,
            report,
        });
    } catch (error) {
        console.error("Data integrity cleanup error:", error);
        res.status(500).json({ success: false, message: error.message || "Cleanup failed." });
    }
};

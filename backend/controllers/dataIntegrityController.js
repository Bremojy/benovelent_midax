const mongoose = require("mongoose");
const crypto = require("crypto");
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

const canonicalizeCarouselUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        // Cloudinary image URLs may differ only by transformation parameters.
        // Compare the underlying public asset path so legacy duplicate uploads
        // are still detected even when one was resized/cropped.
        const marker = '/upload/';
        const index = url.pathname.indexOf(marker);
        if (index >= 0) {
            let path = url.pathname.slice(index + marker.length);
            const segments = path.split('/').filter(Boolean);
            while (segments.length && (segments[0].startsWith('v') && /^v\d+$/.test(segments[0]))) {
                segments.shift();
            }
            // Remove common transformation segments (f_auto,q_auto,w_...,c_...,
            // g_...,e_...) before comparing the underlying public asset.
            while (segments.length && /^(f_|q_|w_|h_|c_|g_|e_|dpr_|ar_|vc_|fl_|so_|du_|bo_)/i.test(segments[0])) {
                segments.shift();
            }
            return `cloudinary:${segments.join('/')}`.toLowerCase();
        }
        url.search = '';
        url.hash = '';
        return url.toString().toLowerCase();
    } catch (_) {
        return raw.split('?')[0].split('#')[0].toLowerCase();
    }
};

const carouselDuplicateKey = (slide) => {
    const hash = normalize(slide.contentHash);
    if (hash) return `hash:${hash}`;

    const canonicalImage = canonicalizeCarouselUrl(slide.imageUrl);
    const meta = [
        canonicalImage,
        normalize(slide.title),
        normalize(slide.description),
        normalize(slide.buttonText),
        normalize(slide.buttonLink),
    ].join('|');

    return `meta:${meta}`;
};

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
    const [memberDocuments, admins, superadmins, conversations, messages, carousels] = await Promise.all([
        Member.find({}).select("fullName name email username memberNumber phone status role isDeleted portalOwnerId portalOwnerRole profileCompletion createdAt updatedAt").lean(),
        Admin.find({ status: { $nin: ["inactive", "deleted"] } }).select("fullName name email username memberNumber phone status deletedAt createdAt updatedAt").lean(),
        SuperAdmin.find({ status: { $nin: ["inactive", "deleted"] } }).select("fullName name email username memberNumber phone status createdAt updatedAt").lean(),
        Conversation.find({}).select("_id participants active updatedAt createdAt lastMessage").lean(),
        Message.find({}).select("_id conversation sender createdAt").lean(),
        Carousel.find({}).select("_id imageUrl contentHash title description isActive order createdAt updatedAt").lean(),
    ]);

    // A Member document can also exist as a legacy chat profile for an Admin or
    // SuperAdmin. Those records must never be counted as scheme members. This
    // distinction is what previously made the integrity page show "2 members"
    // after the real member accounts had been deleted.
    const members = memberDocuments.filter((record) =>
        String(record.role || "member").toLowerCase() === "member" && record.isDeleted !== true
    );
    const archivedMembers = memberDocuments.filter((record) =>
        String(record.role || "member").toLowerCase() === "member" && record.isDeleted === true
    );
    const portalProfiles = memberDocuments.filter((record) =>
        String(record.role || "").toLowerCase() !== "member"
        || record.portalOwnerId
        || record.portalOwnerRole
    );
    const invalidMemberNumbers = members
        .filter((record) => !/^BM\d{3,}$/i.test(String(record.memberNumber || "")))
        .map((record) => ({
            id: String(record._id),
            name: record.fullName || record.name || record.email || "Unnamed",
            email: record.email || "",
            currentNumber: record.memberNumber || "",
            status: record.status || "active",
        }));

    const memberDuplicates = findDuplicateGroups(members);
    const adminDuplicates = findDuplicateGroups(admins);

    const allAccounts = [
        ...memberDocuments.filter((x) => x.isDeleted !== true).map((x) => ({ ...x, model: x.role || "Member" })),
        ...admins.map((x) => ({ ...x, model: "Admin" })),
        ...superadmins.map((x) => ({ ...x, model: "SuperAdmin" })),
    ];

    // Chat may legitimately use a legacy Member-collection profile for an
    // administrator. Those identities are valid conversation participants even
    // though they are not scheme members.
    const accountIds = new Set(allAccounts.map((x) => String(x._id)));
    const orphanConversations = conversations.filter((conversation) =>
        (conversation.participants || []).some((id) => !accountIds.has(String(id)))
    );

    const conversationIds = new Set(conversations.map((x) => String(x._id)));
    const orphanMessages = messages.filter((message) => !conversationIds.has(String(message.conversation)));

    const selfConversations = conversations
        .filter((conversation) => {
            const ids = (conversation.participants || []).map(String).filter(Boolean);
            return ids.length > 0 && new Set(ids).size < 2;
        })
        .map((conversation) => ({
            id: String(conversation._id),
            participants: (conversation.participants || []).map(String),
        }));

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
        const key = carouselDuplicateKey(slide);
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
        database: {
            connected: mongoose.connection.readyState === 1,
            name: mongoose.connection.name || "",
            host: mongoose.connection.host || "",
        },
        counts: {
            members: members.length - memberDuplicates.reduce((sum, group) => sum + Math.max(0, group.length - 1), 0),
            liveMemberRecords: members.length,
            rawMemberCollectionDocuments: memberDocuments.length,
            archivedMemberRecords: archivedMembers.length,
            legacyPortalProfiles: portalProfiles.length,
            invalidMemberNumbers: invalidMemberNumbers.length,
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
            selfConversations: selfConversations.length,
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
        selfConversations,
        duplicateCarousels,
        identityCollisions,
        databaseReconciliation: {
            realMembers: members.length,
            archivedMembers: archivedMembers.length,
            rawMemberCollectionDocuments: memberDocuments.length,
            legacyPortalProfiles: portalProfiles.map((record) => ({
                id: String(record._id),
                role: record.role || "unknown",
                name: record.fullName || record.name || record.email || "Unnamed",
                email: record.email || "",
                portalOwnerId: record.portalOwnerId ? String(record.portalOwnerId) : "",
                portalOwnerRole: record.portalOwnerRole || "",
                isDeleted: record.isDeleted === true,
            })).slice(0, 100),
            invalidMemberNumbers,
            conclusion: members.length === 0
                ? "No live scheme-member records are present. Any remaining Member-collection documents are archived records or legacy portal chat profiles."
                : `${members.length} live scheme-member record${members.length === 1 ? "" : "s"} are present in the database.`,
        },
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

async function removeSelfConversations() {
    const conversations = await Conversation.find({}).select("_id participants").lean();
    const ids = conversations
        .filter((conversation) => {
            const participants = (conversation.participants || []).map(String).filter(Boolean);
            return participants.length > 0 && new Set(participants).size < 2;
        })
        .map((conversation) => conversation._id);

    if (!ids.length) return { removedConversations: 0, removedMessages: 0 };

    const messages = await Message.deleteMany({ conversation: { $in: ids } });
    const conversationsDeleted = await Conversation.deleteMany({ _id: { $in: ids } });
    return {
        removedConversations: conversationsDeleted.deletedCount || 0,
        removedMessages: messages.deletedCount || 0,
    };
}

async function removeLegacyMonthlyIncome() {
    // Personal monthly income is no longer collected or exposed.
    // Remove the legacy field from existing member documents without touching finance ledger income.
    const result = await Member.updateMany(
        { monthlyIncome: { $exists: true } },
        { $unset: { monthlyIncome: 1 } }
    );
    return result.modifiedCount || 0;
}

async function reindexCarouselHashes() {
    const slides = await Carousel.find({}).select("_id imageUrl contentHash").lean();
    let scanned = 0;
    let hashed = 0;
    let failed = 0;
    for (const slide of slides.slice(0, 150)) {
        const url = String(slide.imageUrl || "").trim();
        if (!/^https?:\/\//i.test(url)) continue;
        scanned += 1;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
            clearTimeout(timer);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            if (!buffer.length) throw new Error("Empty image");
            const hash = crypto.createHash("sha256").update(buffer).digest("hex");
            if (hash && hash !== slide.contentHash) {
                await Carousel.updateOne({ _id: slide._id }, { $set: { contentHash: hash } });
            }
            hashed += 1;
        } catch (error) {
            failed += 1;
            console.warn(`Carousel hash scan failed for ${slide._id}: ${error.message}`);
        }
    }
    return { scanned, hashed, failed };
}

async function removeDuplicateCarousels() {
    const slides = await Carousel.find({}).select("_id imageUrl contentHash title description createdAt updatedAt").lean();
    const groups = new Map();

    slides.forEach((slide) => {
        const key = carouselDuplicateKey(slide);
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


const SENSITIVE_BACKUP_KEYS = new Set([
    "password",
    "passwordHash",
    "resetToken",
    "resetPasswordToken",
    "verificationToken",
    "refreshToken",
    "accessToken",
    "token",
    "otp",
    "otpCode",
    "secret",
    "apiKey",
    "privateKey",
    "twoFactorSecret",
]);

function redactForBackup(value, key = "") {
    if (value === null || value === undefined) return value;
    if (SENSITIVE_BACKUP_KEYS.has(String(key))) return "[REDACTED_FOR_SECURITY]";
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value.toHexString === "function" && value._bsontype === "ObjectId") {
        return value.toHexString();
    }
    if (Array.isArray(value)) return value.map((item) => redactForBackup(item, ""));
    if (typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactForBackup(childValue, childKey)]));
    }
    return value;
}


const humanLabel = (value) => String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const humanValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) {
        if (!value.length) return "—";
        return value.map((item) => humanValue(item)).join("; ");
    }
    if (value instanceof Date) return value.toLocaleString("en-KE");
    if (typeof value === "object") {
        return Object.entries(value)
            .map(([key, child]) => `${humanLabel(key)}: ${humanValue(child)}`)
            .join(" · ");
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
};

const renderHumanRecord = (document) => {
    const safe = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[character]));
    const rows = Object.entries(redactForBackup(document))
        .filter(([key]) => key !== "__v")
        .map(([key, value]) => `<tr><th>${safe(humanLabel(key))}</th><td>${safe(humanValue(value))}</td></tr>`)
        .join("");
    return `<table class="record"><tbody>${rows || `<tr><td>No readable fields.</td></tr>`}</tbody></table>`;
};

const buildHumanBackupHtml = async ({ autoPrint = false } = {}) => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        const error = new Error("Database is not currently connected.");
        error.statusCode = 503;
        throw error;
    }

    const collections = await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray();

    const sorted = collections
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    const sections = [];
    for (const collectionName of sorted) {
        const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        const meaning = {
            admins: "Administrator accounts",
            auditlogs: "Security and activity history",
            carousels: "Homepage carousel content",
            contactmessages: "Public contact messages",
            contributions: "Member contribution records",
            conversations: "Chat conversations",
            dependents: "Registered member dependents",
            educationsupports: "Education support applications",
            feedbackcollections: "Feedback forms and responses",
            finances: "Financial transactions and ledger records",
            funeralsupports: "Funeral support applications",
            leaders: "Public leadership profiles",
            medicalsupports: "Medical support applications",
            members: "Member accounts and profiles",
            messages: "Chat messages and attachments",
            news: "News and announcements",
            notifications: "Portal notifications",
            polls: "Polls created for members",
            pushsubscriptions: "Browser push notification subscriptions",
            supportrequests: "General member support requests",
            superadmins: "SuperAdmin accounts",
            votes: "Poll votes",
            websitecontents: "Editable public website content",
        }[collectionName] || "Application records";

        sections.push(`<section class="collection"><div class="collection-title"><div><span class="eyebrow">${humanLabel(collectionName)}</span><h2>${humanLabel(collectionName)}</h2><p>${meaning}</p></div><strong>${documents.length} record${documents.length === 1 ? "" : "s"}</strong></div>${documents.length ? documents.map((doc, index) => `<article class="record-card"><h3>Record ${index + 1}</h3>${renderHumanRecord(doc)}</article>`).join("") : `<div class="empty">No records are currently stored in this collection.</div>`}</section>`);
    }

    const timestamp = new Date();
    const safe = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[character]));

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Benevolent Midax — Human Database Backup</title>
<style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#202531;font-family:Inter,Arial,sans-serif;line-height:1.45}.sheet{max-width:1080px;margin:0 auto;background:#fff;padding:28px}.cover{border:1px solid #ece7df;border-radius:18px;padding:28px;background:linear-gradient(135deg,#fff8ef,#fff)}.brand{font-size:12px;font-weight:800;letter-spacing:.18em;color:#c66b15;text-transform:uppercase}.cover h1{font-family:Georgia,serif;font-size:34px;margin:8px 0 10px}.muted{color:#6e7580}.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}.meta div{padding:14px;border:1px solid #eee;border-radius:12px;background:#fafafa}.meta small{display:block;color:#7c828a;text-transform:uppercase;letter-spacing:.08em;font-weight:700;font-size:10px;margin-bottom:4px}.collection{margin-top:28px;break-before:auto}.collection-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;border-bottom:2px solid #ef7d00;padding-bottom:10px}.collection-title h2{margin:2px 0 3px;font-size:23px}.collection-title p{margin:0;color:#6e7580}.collection-title>strong{font-size:14px;white-space:nowrap}.eyebrow{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#c66b15;font-weight:800}.record-card{margin-top:12px;border:1px solid #e8eaed;border-radius:12px;overflow:hidden;break-inside:avoid}.record-card h3{margin:0;padding:10px 12px;background:#f7f8fa;font-size:13px}.record{width:100%;border-collapse:collapse}.record th,.record td{border-top:1px solid #eceef1;padding:8px 10px;vertical-align:top;text-align:left;font-size:11px}.record th{width:30%;background:#fcfcfd;color:#4d5560}.empty{padding:16px;border:1px dashed #d7dbe0;color:#737985;border-radius:10px}.note{margin-top:20px;padding:14px;border-radius:12px;background:#fff7e8;border:1px solid #f3d29a;color:#6c5123;font-size:12px}.page-break{page-break-before:always}.footer{margin-top:30px;padding-top:12px;border-top:1px solid #eee;color:#7b818b;font-size:10px;text-align:center}@media(max-width:700px){.sheet{padding:16px}.meta{grid-template-columns:1fr}.collection-title{align-items:flex-start;flex-direction:column}}
</style></head><body><main class="sheet">
<section class="cover"><div class="brand">Benevolent Midax · Data Governance</div><h1>Human-Readable Database Backup</h1><p class="muted">A complete application-data snapshot prepared for SuperAdmin records, review, printing and offline reference.</p><div class="meta"><div><small>Generated</small>${safe(timestamp.toLocaleString("en-KE"))}</div><div><small>Database</small>${safe(mongoose.connection.name || "Connected database")}</div><div><small>Collections</small>${safe(sorted.length)}</div></div><div class="note"><strong>Security note:</strong> Passwords, access tokens, reset tokens, API keys, OTPs and other sensitive secret fields are intentionally redacted. This document is a human-readable record, not a credential recovery document.</div></section>
${sections.join("")}
<div class="footer">Benevolent Midax · Confidential SuperAdmin data record · Generated ${safe(timestamp.toLocaleString("en-KE"))}</div>
</main>${autoPrint ? `<script>window.onload=()=>window.print();</script>` : ""}</body></html>`;
};

exports.downloadHumanBackup = async (req, res) => {
    try {
        const html = await buildHumanBackupHtml({ autoPrint: false });
        const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="benevolent-midax-human-backup-${safeTimestamp}.html"`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return res.send(html);
    } catch (error) {
        console.error("Human backup download error:", error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to create human-readable backup." });
    }
};

exports.printHumanBackup = async (req, res) => {
    try {
        const html = await buildHumanBackupHtml({ autoPrint: true });
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return res.send(html);
    } catch (error) {
        console.error("Human backup print error:", error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to create printable human-readable backup." });
    }
};

exports.printDatabaseDetails = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
            return res.status(503).json({ success: false, message: "Database is not currently connected." });
        }
        const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
        const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[character]));
        const sections = [];
        for (const item of collections.sort((a,b) => a.name.localeCompare(b.name))) {
            const docs = await mongoose.connection.db.collection(item.name).find({}).toArray();
            const rows = docs.map((doc, index) => `<tr><td>${index + 1}</td><td><pre>${escapeHtml(JSON.stringify(redactForBackup(doc), null, 2))}</pre></td></tr>`).join("");
            sections.push(`<section><h2>${escapeHtml(item.name)} <span>(${docs.length})</span></h2><table><thead><tr><th>#</th><th>Record</th></tr></thead><tbody>${rows || `<tr><td colspan="2">No records.</td></tr>`}</tbody></table></section>`);
        }
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Benevolent Midax — Full Database Print</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#222;margin:0}header{border-bottom:3px solid #ef7d00;padding:12px 0;margin-bottom:15px}h1{margin:0;font-size:22px}h2{margin:22px 0 8px;font-size:16px;background:#f6f6f6;padding:8px;border-left:4px solid #ef7d00}h2 span{font-weight:400;color:#777}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #ddd;padding:6px;vertical-align:top;font-size:9px}th{background:#f0f0f0;text-align:left}td:first-child{width:35px;text-align:center}pre{white-space:pre-wrap;word-break:break-word;margin:0;font:8px/1.35 Consolas,monospace}section{break-inside:auto;margin-bottom:16px}.note{font-size:11px;color:#666;line-height:1.5}</style></head><body><header><h1>Benevolent Midax — Full Database Print</h1><p class="note">Generated ${escapeHtml(new Date().toLocaleString("en-KE"))}. Credential/token fields are redacted for security. This printout reflects the live MongoDB database at generation time.</p></header>${sections.join("")}<script>window.onload=()=>window.print()</script></body></html>`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return res.send(html);
    } catch (error) {
        console.error("Full database print error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to print database details." });
    }
};

exports.downloadDatabaseBackup = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
            return res.status(503).json({
                success: false,
                message: "Database is not currently connected. Try the backup again after the database reports connected.",
            });
        }

        const collections = await mongoose.connection.db
            .listCollections({}, { nameOnly: true })
            .toArray();

        const collectionNames = collections
            .map((item) => item.name)
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)));

        const backupCollections = {};
        for (const collectionName of collectionNames) {
            const documents = await mongoose.connection.db
                .collection(collectionName)
                .find({})
                .toArray();
            backupCollections[collectionName] = documents.map((document) => redactForBackup(document));
        }

        const timestamp = new Date();
        const safeTimestamp = timestamp.toISOString().replace(/[:.]/g, "-");
        const payload = {
            backupVersion: 1,
            application: "Benevolent Midax",
            generatedAt: timestamp.toISOString(),
            database: mongoose.connection.name || "",
            collectionCount: collectionNames.length,
            securityNote: "Application credential/token fields are redacted from this browser-download backup. Financial, support, member, communication, audit and website data remain included.",
            collections: backupCollections,
        };

        const body = JSON.stringify(payload, null, 2);
        res.status(200);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="benevolent-midax-database-backup-${safeTimestamp}.json"`);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return res.send(body);
    } catch (error) {
        console.error("Database backup error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to create database backup.",
        });
    }
};


exports.getDuplicateMemberPreview = async (req, res) => {
    try {
        const id = String(req.params.id || "").trim();
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid member ID." });
        }
        const member = await Member.findById(id)
            .select("_id fullName name email username memberNumber phone status isDeleted profileCompletion createdAt updatedAt")
            .lean();
        if (!member) {
            return res.status(404).json({ success: false, message: "Member record not found." });
        }
        const references = await findMemberReferences(id);
        return res.json({
            success: true,
            member: {
                id: String(member._id),
                name: member.fullName || member.name || member.email || "Unnamed",
                email: member.email || "",
                username: member.username || "",
                memberNumber: member.memberNumber || "",
                phone: member.phone || "",
                status: member.status || "active",
                profileCompletion: Number(member.profileCompletion || 0),
            },
            references,
        });
    } catch (error) {
        console.error("Duplicate member preview error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to inspect member." });
    }
};

exports.deleteDuplicateMember = async (req, res) => {
    try {
        const id = String(req.params.id || "").trim();
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid member ID." });
        }

        // Make the delete action resilient to a stale report. The integrity page
        // can remain open while another cleanup/delete changes the database.
        const currentMember = await Member.findById(id)
            .select("_id fullName name email username memberNumber phone status isDeleted profileCompletion createdAt updatedAt")
            .lean();

        if (!currentMember || currentMember.isDeleted === true || String(currentMember.status || "") === "inactive") {
            // Idempotent success: the requested cleanup has already happened.
            const report = await buildReport();
            return res.json({
                success: true,
                alreadyRemoved: true,
                message: "Member record was already removed or archived. The integrity report has been refreshed.",
                report,
            });
        }

        const members = await Member.find({ isDeleted: { $ne: true }, status: { $ne: "inactive" } })
            .select("fullName name email username memberNumber phone status profileCompletion createdAt updatedAt")
            .lean();
        const groups = findDuplicateGroups(members);
        const group = groups.find((items) => items.some((item) => String(item._id) === id));
        if (!group) {
            // Do not turn a stale scan into a generic 404. The record still exists,
            // but it is now unique; require the UI to refresh before another action.
            const report = await buildReport();
            return res.status(409).json({
                success: false,
                code: "STALE_INTEGRITY_REPORT",
                message: "This member is no longer identified as a duplicate. The integrity report has been refreshed; review the current results before deleting it.",
                report,
            });
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


exports.getMemberReconciliation = async (req, res) => {
    try {
        const [all, live, archived] = await Promise.all([
            Member.find({}).select("_id fullName email role status isDeleted memberNumber portalOwnerId portalOwnerRole createdAt updatedAt").sort({ createdAt: -1 }).lean(),
            Member.find({ role: "member", isDeleted: false }).select("_id fullName email status memberNumber verified createdAt updatedAt").sort({ createdAt: -1 }).lean(),
            Member.find({ role: "member", isDeleted: true }).select("_id fullName email status memberNumber deletedBy createdAt updatedAt").sort({ updatedAt: -1 }).lean(),
        ]);
        const liveMembers = live;
        const archivedMembers = archived;
        const portalChatProfiles = all.filter(
            (x) => String(x.role || "").toLowerCase() !== "member" || x.portalOwnerId || x.portalOwnerRole
        );

        return res.json({
            success: true,
            database: { connected: mongoose.connection.readyState === 1, name: mongoose.connection.name || "" },
            summary: {
                rawMemberCollectionDocuments: all.length,
                liveMembers: liveMembers.length,
                archivedMembers: archivedMembers.length,
                portalChatProfiles: portalChatProfiles.length,
            },
            liveMembers,
            archivedMembers,
            portalChatProfiles,
        });
    } catch (error) {
        console.error("Member reconciliation error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to reconcile member records." });
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

exports.deepScanCarouselDuplicates = async (req, res) => {
    try {
        const result = await reindexCarouselHashes();
        const removed = await removeDuplicateCarousels();
        const report = await buildReport();
        return res.json({
            success: true,
            message: `Deep carousel scan finished: ${result.scanned} remote slide${result.scanned === 1 ? "" : "s"} scanned, ${result.hashed} image hash${result.hashed === 1 ? "" : "es"} refreshed, ${removed} duplicate slide${removed === 1 ? "" : "s"} removed.`,
            result: { ...result, removedDuplicateCarousels: removed },
            report,
        });
    } catch (error) {
        console.error("Deep carousel scan error:", error);
        return res.status(500).json({ success: false, message: error.message || "Deep carousel scan failed." });
    }
};

exports.cleanupCarouselDuplicates = async (req, res) => {
    try {
        const removedDuplicateCarousels = await removeDuplicateCarousels();
        const report = await buildReport();
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            message: removedDuplicateCarousels
                ? `Removed ${removedDuplicateCarousels} duplicate carousel slide${removedDuplicateCarousels === 1 ? "" : "s"}.`
                : "No duplicate carousel slides were found.",
            result: { removedDuplicateCarousels },
            report,
        });
    } catch (error) {
        console.error("Carousel cleanup error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Carousel cleanup failed.",
        });
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
            result.selfConversations = await removeSelfConversations();
        }
        if (requested === "carousel" || requested === "safe" || requested === "all") {
            result.removedDuplicateCarousels = await removeDuplicateCarousels();
        }
        if (requested === "members" || requested === "safe" || requested === "all") {
            result.removedLegacyMonthlyIncome = await removeLegacyMonthlyIncome();
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


exports.cleanupSelfConversations = async (req, res) => {
    try {
        const result = await removeSelfConversations();
        const report = await buildReport();
        return res.json({ success: true, message: `Removed ${result.removedConversations} self-conversation${result.removedConversations === 1 ? '' : 's'} and ${result.removedMessages} related message${result.removedMessages === 1 ? '' : 's'}.`, result, report });
    } catch (error) {
        console.error("Self-conversation cleanup error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to clean self-conversations." });
    }
};

exports.cleanupOrphanedChatData = async (req, res) => {
    try {
        const result = await removeOrphans();
        const report = await buildReport();
        return res.json({ success: true, message: `Removed ${result.removedConversations} orphan conversation${result.removedConversations === 1 ? '' : 's'} and ${result.removedMessages} orphan message${result.removedMessages === 1 ? '' : 's'}.`, result, report });
    } catch (error) {
        console.error("Orphan cleanup error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to clean orphaned chat data." });
    }
};

exports.removeLegacyMemberIncome = async (req, res) => {
    try {
        const removed = await removeLegacyMonthlyIncome();
        const report = await buildReport();
        return res.json({ success: true, message: `Removed legacy monthly-income fields from ${removed} member record${removed === 1 ? '' : 's'}.`, result: { removedLegacyMonthlyIncome: removed }, report });
    } catch (error) {
        console.error("Legacy monthly income cleanup error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to remove legacy member income fields." });
    }
};

exports.getCollectionInventory = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
            return res.status(503).json({ success: false, message: "Database is not currently connected." });
        }
        const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
        const inventory = [];
        for (const item of collections) {
            const name = item.name;
            const count = await mongoose.connection.db.collection(name).countDocuments();
            inventory.push({ name, count });
        }
        inventory.sort((a,b) => a.name.localeCompare(b.name));
        return res.json({ success: true, database: { name: mongoose.connection.name, connected: true }, collections: inventory });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Unable to inspect collections." });
    }
};

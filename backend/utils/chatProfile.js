const Member = require('../models/Member');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const { generateMemberNumber } = require('./memberNumber');
const generateTemporaryPassword = require('./generateTemporaryPassword');

const VALID_MEMBER_NUMBER = /^BM\d{3,}$/i;
const CHAT_ROLES = new Set(['member', 'admin']);
const ADMIN_ROLES = new Set(['admin', 'superadmin']);

async function ensureValidMemberNumber(member) {
  if (!member || VALID_MEMBER_NUMBER.test(String(member.memberNumber || ''))) return member;
  const replacement = await generateMemberNumber();
  await Member.collection.updateOne({ _id: member._id }, { $set: { memberNumber: replacement } });
  return Member.findById(member._id);
}

function normalizeName(user) {
  return user?.fullName || user?.name || user?.email || 'Portal User';
}

function buildChatProfilePayload(user) {
  return {
    fullName: normalizeName(user),
    username: user?.username || '',
    email: String(user?.email || '').toLowerCase(),
    phone: user?.phone || '',
    profileImage: user?.profileImage || user?.profilePhoto || '',
    role: String(user?.role || 'member').toLowerCase(),
    status: user?.status || 'active',
    verified: true,
    notes: `Auto-synced portal chat profile for ${String(user?.role || 'member').toLowerCase()}.`,
    joinDate: user?.createdAt || new Date(),
    online: Boolean(user?.online),
    lastSeen: user?.lastSeen || new Date(),
  };
}

function same(a, b) { return String(a ?? '') === String(b ?? ''); }

async function findExistingMirror(user, role) {
  const payload = buildChatProfilePayload(user);
  let existing = await Member.findOne({ portalOwnerId: user._id, portalOwnerRole: role, isDeleted: { $ne: true } });
  if (!existing && payload.email) {
    existing = await Member.findOne({
      email: payload.email,
      role,
      notes: { $regex: `^Auto-synced portal chat profile for ${role}\\.$`, $options: 'i' },
      isDeleted: { $ne: true },
    });
  }
  return existing;
}

async function ensureChatProfile(user) {
  if (!user?._id) return null;
  const role = String(user.role || '').toLowerCase();
  if (role === 'member') return user;
  if (!ADMIN_ROLES.has(role)) return null;

  const payload = buildChatProfilePayload(user);
  let existing = await findExistingMirror(user, role);

  if (existing) {
    existing = await ensureValidMemberNumber(existing);
    const desired = {
      fullName: payload.fullName,
      username: existing.username || `${role}-${String(user._id).slice(-6)}`.toLowerCase(),
      email: payload.email || existing.email,
      phone: existing.phone || payload.phone || `000${String(user._id).slice(-6)}`,
      profileImage: payload.profileImage || existing.profileImage || '',
      status: 'active',
      verified: true,
      portalOwnerId: user._id,
      portalOwnerRole: role,
      bio: payload.notes,
      notes: payload.notes,
    };
    const changed = Object.entries(desired).some(([key, value]) => !same(existing[key], value));
    if (changed) {
      Object.assign(existing, desired);
      await existing.save();
    }
    return existing;
  }

  const chatProfile = new Member({
    memberNumber: await generateMemberNumber(),
    fullName: payload.fullName,
    username: `${role}-${String(user._id).slice(-6)}`.toLowerCase(),
    phone: payload.phone || `000${String(user._id).slice(-6)}`,
    email: payload.email,
    password: user.password || generateTemporaryPassword('MIDAX@Chat-'),
    role,
    portalOwnerId: user._id,
    portalOwnerRole: role,
    profileImage: payload.profileImage,
    bio: payload.notes,
    joinDate: payload.joinDate,
    status: 'active',
    verified: true,
    notes: payload.notes,
    online: Boolean(user.online),
    lastSeen: payload.lastSeen,
    isDeleted: false,
  });
  await chatProfile.save();
  return chatProfile;
}

async function resolveChatActor(id, hintedRole = '') {
  const requestedRole = String(hintedRole || '').toLowerCase();
  const chatId = String(id || '').trim();
  if (!chatId) return null;

  async function fromPortal(Model, role) {
    const owner = await Model.findById(chatId).select('_id fullName name role profileImage email phone online lastSeen').lean();
    if (owner) {
      const mirror = await Member.findOne({ portalOwnerId: owner._id, portalOwnerRole: role, isDeleted: { $ne: true } }).select('_id').lean();
      return { user: owner, role, chatId: String(mirror?._id || owner._id), portalOwnerId: String(owner._id) };
    }
    const profile = await Member.findOne({ _id: chatId, portalOwnerRole: role, portalOwnerId: { $ne: null }, isDeleted: { $ne: true } }).select('_id portalOwnerId portalOwnerRole fullName profileImage online lastSeen').lean();
    if (!profile) return null;
    const portalOwner = await Model.findById(profile.portalOwnerId).select('_id fullName name role profileImage email phone online lastSeen').lean();
    if (!portalOwner) return null;
    return { user: portalOwner, role, chatId: String(profile._id), portalOwnerId: String(portalOwner._id) };
  }

  if (requestedRole === 'admin') return fromPortal(Admin, 'admin');
  if (requestedRole === 'superadmin') return fromPortal(SuperAdmin, 'superadmin');
  if (requestedRole === 'member') {
    const member = await Member.findById(chatId).select('_id fullName name role profileImage email phone online lastSeen portalOwnerId portalOwnerRole').lean();
    if (member) return { user: member, role: member.portalOwnerRole || 'member', chatId: String(member._id), portalOwnerId: member.portalOwnerId ? String(member.portalOwnerId) : '' };
  }

  const member = await Member.findById(chatId).select('_id fullName name role profileImage email phone online lastSeen portalOwnerId portalOwnerRole').lean();
  if (member) {
    if (member.portalOwnerId && member.portalOwnerRole === 'admin') {
      const admin = await Admin.findById(member.portalOwnerId).select('_id fullName name role profileImage email phone online lastSeen').lean();
      if (admin) return { user: admin, role: 'admin', chatId: String(member._id), portalOwnerId: String(admin._id) };
    }
    if (member.portalOwnerId && member.portalOwnerRole === 'superadmin') {
      const superadmin = await SuperAdmin.findById(member.portalOwnerId).select('_id fullName name role profileImage email phone online lastSeen').lean();
      if (superadmin) return { user: superadmin, role: 'superadmin', chatId: String(member._id), portalOwnerId: String(superadmin._id) };
    }
    return { user: member, role: 'member', chatId: String(member._id), portalOwnerId: '' };
  }

  for (const [role, Model] of [['admin', Admin], ['superadmin', SuperAdmin], ['member', Member]]) {
    const user = await Model.findById(chatId).select('_id fullName name role profileImage email phone online lastSeen').lean();
    if (user) return { user, role, chatId: String(user._id), portalOwnerId: String(user._id) };
  }
  return null;
}

async function resolveCanonicalChatActorForAuthenticatedUser(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'member') return { user, role, chatId: String(user._id), portalOwnerId: String(user._id) };
  if (role === 'admin' || role === 'superadmin') {
    const mirror = await ensureChatProfile(user);
    if (!mirror?._id) throw new Error('Chat identity could not be prepared.');
    return { user, role, chatId: String(mirror._id), portalOwnerId: String(user._id), chatProfile: mirror };
  }
  return null;
}

function getChatActorId(req) {
  return req.auth?.chatId || req.user?.chatMemberId || req.auth?.id || req.user?._id;
}

function isChatRole(role) { return CHAT_ROLES.has(String(role || '').toLowerCase()); }

module.exports = {
  ensureChatProfile,
  resolveChatActor,
  resolveCanonicalChatActorForAuthenticatedUser,
  getChatActorId,
  isChatRole,
};

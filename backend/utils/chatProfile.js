const Member = require('../models/Member');

function normalizeName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.email ||
    'Portal User'
  );
}

function buildChatProfilePayload(user) {
  return {
    fullName: normalizeName(user),
    username: user?.username || '',
    email: String(user?.email || '').toLowerCase(),
    phone: user?.phone || '',
    profileImage: user?.profileImage || user?.profilePhoto || '',
    role: user?.role || 'member',
    status: user?.status || 'active',
    verified: true,
    monthlyContribution: user?.monthlyContribution || 0,
    notes: `Auto-synced portal chat profile for ${user?.role || 'member'}.`,
    joinDate: user?.createdAt || new Date(),
    online: Boolean(user?.online),
    lastSeen: user?.lastSeen || new Date(),
  };
}

async function ensureChatProfile(user) {
  if (!user?._id) return null;
  const role = String(user.role || '').toLowerCase();
  if (role === 'member') return user;

  const payload = buildChatProfilePayload(user);
  const existing = await Member.findOne({
    email: payload.email,
    role: payload.role,
    isDeleted: { $ne: true },
  });

  if (existing) {
    existing.fullName = payload.fullName;
    if (!existing.username) existing.username = `${payload.role}-${String(user._id).slice(-6)}`.toLowerCase();
    existing.phone = existing.phone || payload.phone || `000${String(user._id).slice(-6)}`;
    existing.profileImage = payload.profileImage || existing.profileImage || '';
    existing.status = 'active';
    existing.verified = true;
    existing.lastSeen = new Date();
    existing.online = Boolean(user.online);
    await existing.save();
    return existing;
  }

  const memberNumberPrefix = role === 'superadmin' ? 'SA' : 'AD';
  const chatProfile = new Member({
    memberNumber: `${memberNumberPrefix}${String(user._id).slice(-8).toUpperCase()}`,
    fullName: payload.fullName,
    username: `${role}-${String(user._id).slice(-6)}`.toLowerCase(),
    phone: payload.phone || `000${String(user._id).slice(-6)}`,
    email: payload.email,
    password: user.password || 'PortalChatOnly123!',
    role: payload.role,
    profileImage: payload.profileImage,
    bio: payload.notes,
    monthlyContribution: payload.monthlyContribution,
    joinDate: payload.joinDate,
    status: 'active',
    verified: true,
    notes: payload.notes,
    online: Boolean(user.online),
    lastSeen: new Date(),
    isDeleted: false,
  });

  await chatProfile.save();
  return chatProfile;
}

function getChatActorId(req) {
  return (
    req.auth?.chatId ||
    req.auth?.id ||
    req.user?.chatMemberId ||
    req.user?._id
  );
}

module.exports = {
  ensureChatProfile,
  getChatActorId,
};

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "resetPasswordToken",
  "resetPasswordExpires",
  "passwordResetToken",
  "passwordResetExpires",
  "sessionSecret",
  "sessionSecrets",
  "refreshToken",
  "accessToken",
  "internalToken",
  "internalTokens",
  "failedLoginAttempts",
  "accountLockedUntil",
  "lastLoginIP",
  "lastDevice",
  "monthlyIncome",
]);

function sanitizeDocument(value) {
  if (!value) return value;
  const output = typeof value.toObject === "function" ? value.toObject({ getters: false, virtuals: false }) : { ...value };
  for (const key of Object.keys(output)) {
    if (SENSITIVE_FIELDS.has(key)) delete output[key];
  }
  if (output.finance && typeof output.finance === "object") output.finance = sanitizeDocument(output.finance);
  if (output.member && typeof output.member === "object") output.member = sanitizeDocument(output.member);
  return output;
}

function sanitizeMemberForClient(member) {
  return sanitizeDocument(member);
}

function sanitizeAdminForClient(admin) {
  return sanitizeDocument(admin);
}

function sanitizeSuperAdminForClient(superadmin) {
  return sanitizeDocument(superadmin);
}

function sanitizeConversationForClient(conversation) {
  if (!conversation) return conversation;
  const value = sanitizeDocument(conversation);
  delete value.directKey;
  return value;
}

module.exports = {
  SENSITIVE_FIELDS,
  sanitizeDocument,
  sanitizeMemberForClient,
  sanitizeAdminForClient,
  sanitizeSuperAdminForClient,
  sanitizeConversationForClient,
};

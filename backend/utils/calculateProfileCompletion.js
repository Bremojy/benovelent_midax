const PROFILE_FIELDS = [
  { key: "profileImage", label: "Profile photo" },
  { key: "memberNumber", label: "Employee number" },
  { key: "phone", label: "Phone number" },
  { key: "nationalId", label: "National ID" },
  { key: "gender", label: "Gender" },
  { key: "maritalStatus", label: "Marital status" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "physicalAddress", label: "Physical address" },
  { key: "siteStation", label: "Site station" },
  { key: "nextOfKin.fullName", label: "Next of kin name" },
  { key: "nextOfKin.relationship", label: "Next of kin relationship" },
  { key: "nextOfKin.phone", label: "Next of kin phone" },
];

const getValue = (source, path) => String(path).split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), source);
const isFilled = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return value !== undefined && value !== null && String(value).trim() !== "";
};

module.exports = function calculateProfileCompletion(member = {}) {
  const checklist = PROFILE_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    completed: isFilled(getValue(member, field.key)),
  }));
  const completed = checklist.filter((item) => item.completed).length;
  const total = checklist.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return {
    completed,
    total,
    percentage,
    missingFields: checklist.filter((item) => !item.completed).map((item) => item.label),
    completedFields: checklist.filter((item) => item.completed).map((item) => item.label),
    checklist,
  };
};
module.exports.PROFILE_FIELDS = PROFILE_FIELDS;

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
];

const SITE_STATION_NONE = "None of above";

const getValue = (source, path) => String(path).split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), source);

const isFilled = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return value !== undefined && value !== null && String(value).trim() !== "";
};

function buildChecklist(member = {}) {
  const checklist = PROFILE_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    completed: isFilled(getValue(member, field.key)),
  }));

  if (String(member.siteStation || "").trim() === SITE_STATION_NONE) {
    checklist.push(
      {
        key: "customSiteStation",
        label: "Your site station",
        completed: isFilled(member.customSiteStation),
      },
      {
        key: "nextOfKin.fullName",
        label: "Next of kin name",
        completed: isFilled(getValue(member, "nextOfKin.fullName")),
      },
      {
        key: "nextOfKin.relationship",
        label: "Next of kin relationship",
        completed: isFilled(getValue(member, "nextOfKin.relationship")),
      },
      {
        key: "nextOfKin.phone",
        label: "Next of kin phone",
        completed: isFilled(getValue(member, "nextOfKin.phone")),
      },
    );
  }

  return checklist;
}

module.exports = function calculateProfileCompletion(member = {}) {
  const checklist = buildChecklist(member);
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

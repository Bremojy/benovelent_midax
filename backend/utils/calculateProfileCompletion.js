
const PROFILE_FIELDS = [
  { key: "fullName", label: "Full name" },
  { key: "memberNumber", label: "Member number" },
  { key: "phone", label: "Phone number" },
  { key: "email", label: "Email address" },
  { key: "nationalId", label: "National ID" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "maritalStatus", label: "Marital status" },
  { key: "county", label: "County" },
  { key: "subCounty", label: "Sub-county" },
  { key: "ward", label: "Ward" },
  { key: "village", label: "Village" },
  { key: "postalAddress", label: "Postal address" },
  { key: "physicalAddress", label: "Physical address" },
  { key: "occupation", label: "Occupation" },
  { key: "employer", label: "Employer" },
  { key: "monthlyIncome", label: "Monthly income" },
  { key: "nextOfKin.fullName", label: "Next of kin name" },
  { key: "nextOfKin.phone", label: "Next of kin phone" },
  { key: "nextOfKin.relationship", label: "Next of kin relationship" },
  { key: "nextOfKin.nationalId", label: "Next of kin ID" },
  { key: "mpesaNumber", label: "M-Pesa number" },
  { key: "bankName", label: "Bank name" },
  { key: "bankBranch", label: "Bank branch" },
  { key: "accountNumber", label: "Account number" },
  { key: "documents.nationalIdFront", label: "National ID front copy" },
  { key: "documents.nationalIdBack", label: "National ID back copy" },
  { key: "documents.passportPhoto", label: "Passport photo" },
  { key: "documents.signature", label: "Signature" },
  { key: "profileImage", label: "Profile photo" },
  { key: "acceptedConstitution", label: "Constitution acceptance" },
  { key: "acceptedPrivacyPolicy", label: "Privacy policy acceptance" },
  { key: "acceptedDeclaration", label: "Declaration acceptance" },
];

function getValue(source, path) {
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), source);
}

function isFilled(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function calculateProfileCompletion(member = {}) {
  const checklist = PROFILE_FIELDS.map((field) => {
    const value = getValue(member, field.key);
    const completed = isFilled(value);
    return {
      key: field.key,
      label: field.label,
      completed,
      value: completed ? value : "",
    };
  });

  const completedCount = checklist.filter((item) => item.completed).length;
  const total = checklist.length;
  const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const missingFields = checklist.filter((item) => !item.completed).map((item) => item.label);
  const completedFields = checklist.filter((item) => item.completed).map((item) => item.label);

  return {
    completed: completedCount,
    total,
    percentage,
    missingFields,
    completedFields,
    checklist,
  };
}

module.exports = calculateProfileCompletion;
module.exports.PROFILE_FIELDS = PROFILE_FIELDS;

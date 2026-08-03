import {
  useEffect,
  useState,
} from "react";

import DashboardLayout
  from "../../layouts/DashboardLayout";

import {
  getMemberProfile,
  updateMemberProfileWithPhoto,
} from "../../services/memberService";

import "./Profile.css";

export default function Profile() {
  const [member, setMember] =
    useState(null);

  const [profileCompletion, setProfileCompletion] =
    useState(null);

  const [dependents, setDependents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [profileFiles, setProfileFiles] =
    useState({});

  // =====================================
  // LOAD PROFILE
  // =====================================

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getMemberProfile();

      if (
        !response?.success
      ) {
        throw new Error(
          response?.message ||
            "Unable to load profile."
        );
      }

      setMember(
        response.member
      );

      setProfileCompletion(
        response.profileCompletion
      );

      setDependents(
        Array.isArray(
          response.dependents
        )
          ? response.dependents
          : []
      );

    } catch (err) {
      console.error(
        "Profile error:",
        err
      );

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // =====================================
  // INPUT CHANGE
  // =====================================

  const updateField = (
    field,
    value
  ) => {
    setMember(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const updateNestedField = (
    section,
    field,
    value
  ) => {
    setMember(
      (current) => ({
        ...current,

        [section]: {
          ...(current?.[section] || {}),
          [field]: value,
        },
      })
    );
  };

  const updateFile = (field, file) => {
    setProfileFiles((current) => ({
      ...current,
      [field]: file || null,
    }));
  };

  // =====================================
  // SAVE
  // =====================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!member) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        fullName:
          member.fullName,

        username:
          member.username,

        email:
          member.email,

        phone:
          member.phone,

        bio:
          member.bio,

        nationalId:
          member.nationalId,

        gender:
          member.gender,

        dateOfBirth:
          member.dateOfBirth,

        maritalStatus:
          member.maritalStatus,

        county:
          member.county,

        subCounty:
          member.subCounty,

        ward:
          member.ward,

        village:
          member.village,

        postalAddress:
          member.postalAddress,

        physicalAddress:
          member.physicalAddress,

        occupation:
          member.occupation,

        employer:
          member.employer,

        monthlyIncome:
          member.monthlyIncome,

        nextOfKin:
          member.nextOfKin,

        mpesaNumber:
          member.mpesaNumber,

        bankName:
          member.bankName,

        bankBranch:
          member.bankBranch,

        accountNumber:
          member.accountNumber,

        acceptedConstitution:
          Boolean(member.acceptedConstitution),

        acceptedPrivacyPolicy:
          Boolean(member.acceptedPrivacyPolicy),

        acceptedDeclaration:
          Boolean(member.acceptedDeclaration),

        emergencyContact:
          member.emergencyContact,
      };

      const response =
        await updateMemberProfileWithPhoto(
          payload,
          profileFiles
        );

      if (
        !response?.success
      ) {
        throw new Error(
          response?.message ||
            "Unable to update profile."
        );
      }

      if (response.member) {
        setMember(
          response.member
        );
      }

      if (response.completion) {
        setProfileCompletion(
          response.completion
        );
      }

      setSuccess(
        "Your profile has been updated successfully."
      );

    } catch (err) {
      console.error(
        "Update profile error:",
        err
      );

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to update your profile."
      );

    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <DashboardLayout>

        <div className="profile-loading">

          <div className="profile-spinner"></div>

          <h3>
            Loading your profile...
          </h3>

        </div>

      </DashboardLayout>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (error && !member) {
    return (
      <DashboardLayout>

        <div className="profile-error">

          <h2>
            Unable to load profile
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={loadProfile}
          >
            Try Again
          </button>

        </div>

      </DashboardLayout>
    );
  }

  const completion =
    profileCompletion?.percentage ??
    member?.profileCompletion ??
    0;

  return (
    <DashboardLayout>

      <div className="member-profile-page">

        {/* =================================
            HEADER
        ================================= */}

        <section className="profile-page-header">

          <div>

            <span>
              MEMBER PROFILE
            </span>

            <h1>
              My Profile
            </h1>

            <p>
              Keep your membership information
              accurate and up to date.
            </p>

          </div>

          <div className="profile-completion-badge">

            <strong>
              {completion}%
            </strong>

            <small>
              Profile complete
            </small>

          </div>

{profileCompletion?.checklist?.length > 0 && (
  <section className="profile-checklist-panel">
    <h2>What you still need to make it 100%</h2>
    <div className="profile-checklist-grid">
      {profileCompletion.checklist.map((item) => (
        <div key={item.key} className={item.completed ? "profile-checklist-item complete" : "profile-checklist-item"}>
          <strong>{item.label}</strong>
          <span>{item.completed ? "Completed" : "Missing"}</span>
        </div>
      ))}
    </div>
    {profileCompletion.missingFields?.length > 0 && (
      <p className="profile-checklist-note">Missing: {profileCompletion.missingFields.join(", ")}</p>
    )}
  </section>
)}

        </section>

        {/* =================================
            MESSAGES
        ================================= */}

        {error && (
          <div className="profile-alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="profile-alert success">
            {success}
          </div>
        )}

        {/* =================================
            PROFILE FORM
        ================================= */}

        <form
          className="profile-form"
          onSubmit={handleSave}
        >

          {/* ================================
              PERSONAL
          ================================= */}

          <ProfileSection
            title="Personal Information"
            description="Your basic personal details."
          >

            <div className="profile-form-grid">

              <FormField
                label="Full Name"
                value={
                  member?.fullName
                }
                onChange={(value) =>
                  updateField(
                    "fullName",
                    value
                  )
                }
                required
              />

              <FormField
                label="Username"
                value={
                  member?.username
                }
                onChange={(value) =>
                  updateField(
                    "username",
                    value
                  )
                }
              />

              <FormField
                label="Email"
                type="email"
                value={
                  member?.email
                }
                onChange={(value) =>
                  updateField(
                    "email",
                    value
                  )
                }
              />

              <FormField
                label="Phone"
                value={
                  member?.phone
                }
                onChange={(value) =>
                  updateField(
                    "phone",
                    value
                  )
                }
                required
              />

              <FormField
                label="National ID"
                value={
                  member?.nationalId
                }
                onChange={(value) =>
                  updateField(
                    "nationalId",
                    value
                  )
                }
              />

              <SelectField
                label="Gender"
                value={
                  member?.gender
                }
                onChange={(value) =>
                  updateField(
                    "gender",
                    value
                  )
                }
                options={[
                  "",
                  "Male",
                  "Female",
                  "Other",
                ]}
              />

              <FormField
                label="Date of Birth"
                type="date"
                value={
                  member?.dateOfBirth
                    ? new Date(
                        member.dateOfBirth
                      )
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(value) =>
                  updateField(
                    "dateOfBirth",
                    value
                  )
                }
              />

              <SelectField
                label="Marital Status"
                value={
                  member?.maritalStatus
                }
                onChange={(value) =>
                  updateField(
                    "maritalStatus",
                    value
                  )
                }
                options={[
                  "",
                  "Single",
                  "Married",
                  "Divorced",
                  "Widowed",
                ]}
              />

            </div>

            <FormTextarea
              label="Bio"
              value={
                member?.bio
              }
              onChange={(value) =>
                updateField(
                  "bio",
                  value
                )
              }
              placeholder="Tell us a little about yourself..."
            />

          </ProfileSection>

          {/* ================================
              ADDRESS
          ================================= */}

          <ProfileSection
            title="Address Information"
            description="Your current location and postal information."
          >

            <div className="profile-form-grid">

              <FormField
                label="County"
                value={
                  member?.county
                }
                onChange={(value) =>
                  updateField(
                    "county",
                    value
                  )
                }
              />

              <FormField
                label="Sub County"
                value={
                  member?.subCounty
                }
                onChange={(value) =>
                  updateField(
                    "subCounty",
                    value
                  )
                }
              />

              <FormField
                label="Ward"
                value={
                  member?.ward
                }
                onChange={(value) =>
                  updateField(
                    "ward",
                    value
                  )
                }
              />

              <FormField
                label="Village"
                value={
                  member?.village
                }
                onChange={(value) =>
                  updateField(
                    "village",
                    value
                  )
                }
              />

              <FormField
                label="Postal Address"
                value={
                  member?.postalAddress
                }
                onChange={(value) =>
                  updateField(
                    "postalAddress",
                    value
                  )
                }
              />

              <FormField
                label="Physical Address"
                value={
                  member?.physicalAddress
                }
                onChange={(value) =>
                  updateField(
                    "physicalAddress",
                    value
                  )
                }
              />

            </div>

          </ProfileSection>

          {/* ================================
              DOCUMENTS
          ================================= */}

          <ProfileSection
            title="Documents & Verification"
            description="Upload the items needed to complete your profile."
          >

            <div className="profile-form-grid">

              <FileField
                label="Profile Photo"
                value={profileFiles.profileImage}
                existing={member?.profileImage}
                onChange={(file) => updateFile("profileImage", file)}
              />

              <FileField
                label="Passport Photo"
                value={profileFiles.passportPhoto}
                existing={member?.passportPhoto || member?.documents?.passportPhoto}
                onChange={(file) => updateFile("passportPhoto", file)}
              />

              <FileField
                label="National ID Front Copy"
                value={profileFiles.nationalIdFront}
                existing={member?.documents?.nationalIdFront}
                onChange={(file) => updateFile("nationalIdFront", file)}
              />

              <FileField
                label="National ID Back Copy"
                value={profileFiles.nationalIdBack}
                existing={member?.documents?.nationalIdBack}
                onChange={(file) => updateFile("nationalIdBack", file)}
              />

              <FileField
                label="Signature"
                value={profileFiles.signature}
                existing={member?.documents?.signature}
                onChange={(file) => updateFile("signature", file)}
              />

            </div>

          </ProfileSection>

          {/* ================================
              EMPLOYMENT
          ================================= */}

          <ProfileSection
            title="Employment Information"
            description="Your current employment details."
          >

            <div className="profile-form-grid">

              <FormField
                label="Occupation"
                value={
                  member?.occupation
                }
                onChange={(value) =>
                  updateField(
                    "occupation",
                    value
                  )
                }
              />

              <FormField
                label="Employer"
                value={
                  member?.employer
                }
                onChange={(value) =>
                  updateField(
                    "employer",
                    value
                  )
                }
              />

              <FormField
                label="Monthly Income"
                type="number"
                value={
                  member?.monthlyIncome ??
                  ""
                }
                onChange={(value) =>
                  updateField(
                    "monthlyIncome",
                    value
                  )
                }
              />

            </div>

          </ProfileSection>

          {/* ================================
              NEXT OF KIN
          ================================= */}

          <ProfileSection
            title="Next of Kin"
            description="The person registered as your next of kin."
          >

            <div className="profile-form-grid">

              <FormField
                label="Full Name"
                value={
                  member?.nextOfKin
                    ?.fullName
                }
                onChange={(value) =>
                  updateNestedField(
                    "nextOfKin",
                    "fullName",
                    value
                  )
                }
              />

              <FormField
                label="Relationship"
                value={
                  member?.nextOfKin
                    ?.relationship
                }
                onChange={(value) =>
                  updateNestedField(
                    "nextOfKin",
                    "relationship",
                    value
                  )
                }
              />

              <FormField
                label="Phone"
                value={
                  member?.nextOfKin
                    ?.phone
                }
                onChange={(value) =>
                  updateNestedField(
                    "nextOfKin",
                    "phone",
                    value
                  )
                }
              />

              <FormField
                label="National ID"
                value={
                  member?.nextOfKin
                    ?.nationalId
                }
                onChange={(value) =>
                  updateNestedField(
                    "nextOfKin",
                    "nationalId",
                    value
                  )
                }
              />

            </div>

          </ProfileSection>

          {/* ================================
              EMERGENCY
          ================================= */}

          <ProfileSection
            title="Emergency Contact"
            description="Someone we can contact in case of emergency."
          >

            <div className="profile-form-grid">

              <FormField
                label="Full Name"
                value={
                  member?.emergencyContact
                    ?.fullName
                }
                onChange={(value) =>
                  updateNestedField(
                    "emergencyContact",
                    "fullName",
                    value
                  )
                }
              />

              <FormField
                label="Relationship"
                value={
                  member?.emergencyContact
                    ?.relationship
                }
                onChange={(value) =>
                  updateNestedField(
                    "emergencyContact",
                    "relationship",
                    value
                  )
                }
              />

              <FormField
                label="Phone"
                value={
                  member?.emergencyContact
                    ?.phone
                }
                onChange={(value) =>
                  updateNestedField(
                    "emergencyContact",
                    "phone",
                    value
                  )
                }
              />

            </div>

          </ProfileSection>

          {/* ================================
              AGREEMENTS
          ================================= */}

          <ProfileSection
            title="Agreements"
            description="Accept the constitution and policy documents to unlock full access."
          >

            <div className="profile-checklist-grid agreement-grid">

              <CheckboxField
                label="Constitution acceptance"
                checked={Boolean(member?.acceptedConstitution)}
                onChange={(checked) => updateField("acceptedConstitution", checked)}
              />

              <CheckboxField
                label="Privacy policy acceptance"
                checked={Boolean(member?.acceptedPrivacyPolicy)}
                onChange={(checked) => updateField("acceptedPrivacyPolicy", checked)}
              />

              <CheckboxField
                label="Declaration acceptance"
                checked={Boolean(member?.acceptedDeclaration)}
                onChange={(checked) => updateField("acceptedDeclaration", checked)}
              />

            </div>

          </ProfileSection>

          {/* ================================
              PAYMENT
          ================================= */}

          <ProfileSection
            title="Payment Information"
            description="Your registered payment details."
          >

            <div className="profile-form-grid">

              <FormField
                label="M-Pesa Number"
                value={
                  member?.mpesaNumber
                }
                onChange={(value) =>
                  updateField(
                    "mpesaNumber",
                    value
                  )
                }
              />

              <FormField
                label="Bank Name"
                value={
                  member?.bankName
                }
                onChange={(value) =>
                  updateField(
                    "bankName",
                    value
                  )
                }
              />

              <FormField
                label="Bank Branch"
                value={
                  member?.bankBranch
                }
                onChange={(value) =>
                  updateField(
                    "bankBranch",
                    value
                  )
                }
              />

              <FormField
                label="Account Number"
                value={
                  member?.accountNumber
                }
                onChange={(value) =>
                  updateField(
                    "accountNumber",
                    value
                  )
                }
              />

            </div>

          </ProfileSection>

          {/* =================================
              SAVE
          ================================= */}

          <div className="profile-save-bar">

            <div>
              <strong>
                Keep your information updated
              </strong>

              <span>
                Accurate information helps us
                process your benefits correctly.
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>

        {/* =================================
            DEPENDENTS
        ================================= */}

        <section className="profile-section">

          <div className="profile-section-heading">

            <div>
              <h2>
                Registered Dependents
              </h2>

              <p>
                Dependents currently linked
                to your membership.
              </p>
            </div>

            <span className="dependent-count">
              {dependents.length}
            </span>

          </div>

          {dependents.length === 0 ? (
            <div className="empty-dependents">
              No dependents have been registered.
            </div>
          ) : (
            <div className="dependents-grid">

              {dependents.map(
                (dependent) => (
                  <div
                    className="dependent-card"
                    key={
                      dependent._id
                    }
                  >

                    <h3>
                      {
                        dependent.fullName ||
                        "Dependent"
                      }
                    </h3>

                    <p>
                      {
                        dependent.relationship ||
                        "Relationship not specified"
                      }
                    </p>

                    {dependent.phone && (
                      <span>
                        {dependent.phone}
                      </span>
                    )}

                    <div>
                      {dependent.verified
                        ? "✓ Verified"
                        : "Pending verification"}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>

    </DashboardLayout>
  );
}

// =========================================
// REUSABLE COMPONENTS
// =========================================

function ProfileSection({
  title,
  description,
  children,
}) {
  return (
    <section className="profile-section">

      <div className="profile-section-heading">

        <div>
          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>
        </div>

      </div>

      {children}

    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <div className="profile-field">

      <label>
        {label}

        {required && (
          <span> *</span>
        )}
      </label>

      <input
        type={type}
        value={value ?? ""}
        required={required}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />

    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div className="profile-field">

      <label>
        {label}
      </label>

      <select
        value={value || ""}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      >

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option ||
                `Select ${label}`}
            </option>
          )
        )}

      </select>

    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="profile-field full">

      <label>
        {label}
      </label>

      <textarea
        rows="4"
        value={value ?? ""}
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />

    </div>
  );
}

function FileField({
  label,
  value,
  existing,
  onChange,
}) {
  return (
    <div className="profile-field full">
      <label>{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <small className="profile-file-note">
        {value?.name || (existing ? "Saved on file" : "No file selected")}
      </small>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="profile-checkbox">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

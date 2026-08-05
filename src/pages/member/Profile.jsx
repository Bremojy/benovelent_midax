import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, FileImage, FileText, ShieldCheck, UploadCloud, UserCircle2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getMemberProfile, updateMemberProfileWithPhoto } from "../../services/memberService";
import { resolveApiUrl } from "../../services/api";
import "./Profile.css";

const STATIONS = ["Chokaa", "Saika", "Ruaraka", "Garden City", "Garden Estate", "Jacaranda", "Depot", "None of above"];

const DEFAULT_MEMBER = {
  fullName: "",
  phone: "",
  email: "",
  nationalId: "",
  gender: "",
  dateOfBirth: "",
  maritalStatus: "",
  physicalAddress: "",
  siteStation: "",
  customSiteStation: "",
  occupation: "",
  employer: "",
  monthlyIncome: "",
  mpesaNumber: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  acceptedConstitution: false,
  acceptedPrivacyPolicy: false,
  acceptedDeclaration: false,
  nextOfKin: { fullName: "", relationship: "", phone: "", nationalId: "" },
  emergencyContact: { fullName: "", relationship: "", phone: "" },
};

export default function Profile() {
  const [member, setMember] = useState(DEFAULT_MEMBER);
  const [completion, setCompletion] = useState({ percentage: 0, missingFields: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploads, setUploads] = useState({
    profileImage: null,
    passportPhoto: null,
    nationalIdFront: null,
    nationalIdBack: null,
    signature: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const response = await getMemberProfile();
        const current = response.member || {};
        setMember({
          ...DEFAULT_MEMBER,
          ...current,
          nextOfKin: {
            ...DEFAULT_MEMBER.nextOfKin,
            ...(current.nextOfKin || {}),
          },
          emergencyContact: {
            ...DEFAULT_MEMBER.emergencyContact,
            ...(current.emergencyContact || {}),
          },
        });
        setCompletion(response.profileCompletion || { percentage: 0, missingFields: [] });
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pct = Number(completion?.percentage || 0);

  const missing = useMemo(() => {
    const extra = completion?.missingFields || [];
    return Array.isArray(extra) ? extra : [];
  }, [completion]);

  const set = (key, value) => setMember((current) => ({ ...current, [key]: value }));
  const digitsOnly = (value) => String(value ?? "").replace(/\D+/g, "");
  const setNumeric = (key, value) => set(key, digitsOnly(value));
  const setKin = (key, value) => setMember((current) => ({ ...current, nextOfKin: { ...(current?.nextOfKin || {}), [key]: value } }));
  const setKinNumeric = (key, value) => setKin(key, digitsOnly(value));
  const setEmergency = (key, value) => setMember((current) => ({ ...current, emergencyContact: { ...(current?.emergencyContact || {}), [key]: value } }));
  const setEmergencyNumeric = (key, value) => setEmergency(key, digitsOnly(value));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        fullName: member.fullName || "",
        phone: member.phone || "",
        email: member.email || "",
        nationalId: member.nationalId || "",
        gender: member.gender || "",
        maritalStatus: member.maritalStatus || "",
        dateOfBirth: member.dateOfBirth || "",
        physicalAddress: member.physicalAddress || "",
        siteStation: member.siteStation || "",
        customSiteStation: member.customSiteStation || "",
        occupation: member.occupation || "",
        employer: member.employer || "",
        monthlyIncome: member.monthlyIncome || "",
        mpesaNumber: member.mpesaNumber || "",
        bankName: member.bankName || "",
        bankBranch: member.bankBranch || "",
        accountNumber: member.accountNumber || "",
        acceptedConstitution: Boolean(member.acceptedConstitution),
        acceptedPrivacyPolicy: Boolean(member.acceptedPrivacyPolicy),
        acceptedDeclaration: Boolean(member.acceptedDeclaration),
        nextOfKin: member.nextOfKin || {},
        emergencyContact: member.emergencyContact || {},
      };

      const response = await updateMemberProfileWithPhoto(payload, uploads);
      setMember({
        ...DEFAULT_MEMBER,
        ...(response.member || {}),
        nextOfKin: { ...DEFAULT_MEMBER.nextOfKin, ...(response.member?.nextOfKin || {}) },
        emergencyContact: { ...DEFAULT_MEMBER.emergencyContact, ...(response.member?.emergencyContact || {}) },
      });
      setCompletion(response.completion || response.profileCompletion || { percentage: 0, missingFields: [] });
      setSuccess("Profile saved successfully.");
      setUploads({
        profileImage: null,
        passportPhoto: null,
        nationalIdFront: null,
        nationalIdBack: null,
        signature: null,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="portal-empty">Loading profile...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="portal-module profile-modern">
        <header className="portal-module-header profile-modern-header">
          <div>
            <span className="profile-eyebrow">MEMBER PROFILE</span>
            <h1>Complete your membership profile</h1>
            <p>Upload your documents, agree to the constitution, and keep your live data in sync with admins and superadmins.</p>
          </div>

          <div className="profile-score-card">
            <div className="profile-score-circle">{pct}%</div>
            <div>
              <strong>Profile completion</strong>
              <div>{missing.length ? `${missing.length} item(s) still required` : "All core details captured"}</div>
              <div className="profile-progress-track" aria-hidden="true">
                <span className="profile-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </header>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-alert success">{success}</div>}

        <form onSubmit={save} className="profile-grid">
          <section className="portal-panel profile-panel">
            <div className="profile-section-title">
              <UserCircle2 size={18} />
              <h2>Personal details</h2>
            </div>
            <div className="profile-card-grid">
              <Field label="Full name" value={member.fullName} onChange={(v) => set("fullName", v)} required />
              <Field label="Phone" type="tel" numericOnly value={member.phone} onChange={(v) => setNumeric("phone", v)} required />
              <Field label="Email" type="email" value={member.email} onChange={(v) => set("email", v)} />
              <Field label="National ID" numericOnly value={member.nationalId} onChange={(v) => setNumeric("nationalId", v)} required />
              <Select label="Gender" value={member.gender} onChange={(v) => set("gender", v)} options={["Male", "Female", "Other"]} />
              <Select label="Marital status" value={member.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={["Single", "Married", "Divorced", "Widowed"]} />
              <Field label="Date of birth" type="date" value={member.dateOfBirth ? String(member.dateOfBirth).slice(0, 10) : ""} onChange={(v) => set("dateOfBirth", v)} />
              <Field label="Physical address" value={member.physicalAddress} onChange={(v) => set("physicalAddress", v)} />
            </div>
          </section>

          <section className="portal-panel profile-panel">
            <div className="profile-section-title">
              <Camera size={18} />
              <h2>Uploads</h2>
            </div>

            <div className="profile-upload-grid">
              <UploadCard title="Profile photo" hint="Visible on your profile" value={member.profileImage} file={uploads.profileImage} onFile={(file) => setUploads((prev) => ({ ...prev, profileImage: file }))} icon={<Camera size={18} />} />
              <UploadCard title="Passport photo" hint="Passport-sized image" value={member.passportPhoto} file={uploads.passportPhoto} onFile={(file) => setUploads((prev) => ({ ...prev, passportPhoto: file }))} icon={<FileImage size={18} />} />
              <UploadCard title="ID front" hint="National ID front side" value={member.documents?.nationalIdFront} file={uploads.nationalIdFront} onFile={(file) => setUploads((prev) => ({ ...prev, nationalIdFront: file }))} icon={<FileText size={18} />} />
              <UploadCard title="ID back" hint="National ID back side" value={member.documents?.nationalIdBack} file={uploads.nationalIdBack} onFile={(file) => setUploads((prev) => ({ ...prev, nationalIdBack: file }))} icon={<FileText size={18} />} />
              <UploadCard title="Signature" hint="Digital signature image" value={member.documents?.signature} file={uploads.signature} onFile={(file) => setUploads((prev) => ({ ...prev, signature: file }))} icon={<UploadCloud size={18} />} />
            </div>
          </section>

          <section className="portal-panel profile-panel">
            <div className="profile-section-title">
              <ShieldCheck size={18} />
              <h2>Membership agreements</h2>
            </div>
            <div className="profile-checklist">
              <Agreement label="I agree to the constitution" checked={member.acceptedConstitution} onChange={(checked) => set("acceptedConstitution", checked)} />
              <Agreement label="I agree to the privacy policy" checked={member.acceptedPrivacyPolicy} onChange={(checked) => set("acceptedPrivacyPolicy", checked)} />
              <Agreement label="I accept the declaration" checked={member.acceptedDeclaration} onChange={(checked) => set("acceptedDeclaration", checked)} />
            </div>

            <div className="profile-card-grid" style={{ marginTop: 16 }}>
              <Select label="Site station" value={member.siteStation} onChange={(v) => set("siteStation", v)} options={STATIONS} />
              {member.siteStation === "None of above" && (
                <Field label="Custom site station" value={member.customSiteStation} onChange={(v) => set("customSiteStation", v)} required />
              )}
              <Field label="Occupation" value={member.occupation} onChange={(v) => set("occupation", v)} />
              <Field label="Employer" value={member.employer} onChange={(v) => set("employer", v)} />
              <Field label="Monthly income" type="number" numericOnly value={member.monthlyIncome} onChange={(v) => setNumeric("monthlyIncome", v)} />
              <Field label="M-Pesa number" numericOnly value={member.mpesaNumber} onChange={(v) => setNumeric("mpesaNumber", v)} />
              <Field label="Bank name" value={member.bankName} onChange={(v) => set("bankName", v)} />
              <Field label="Bank branch" value={member.bankBranch} onChange={(v) => set("bankBranch", v)} />
              <Field label="Account number" numericOnly value={member.accountNumber} onChange={(v) => setNumeric("accountNumber", v)} />
            </div>
          </section>

          <section className="portal-panel profile-panel">
            <div className="profile-section-title">
              <CheckCircle2 size={18} />
              <h2>Emergency contact & next of kin</h2>
            </div>

            <div className="profile-card-grid">
              <Field label="Emergency contact name" value={member.emergencyContact?.fullName || ""} onChange={(v) => setEmergency("fullName", v)} required />
              <Field label="Emergency contact relationship" value={member.emergencyContact?.relationship || ""} onChange={(v) => setEmergency("relationship", v)} required />
              <Field label="Emergency contact phone" type="tel" numericOnly value={member.emergencyContact?.phone || ""} onChange={(v) => setEmergencyNumeric("phone", v)} required />
              <Field label="Next of kin name" value={member.nextOfKin?.fullName || ""} onChange={(v) => setKin("fullName", v)} required />
              <Field label="Next of kin relationship" value={member.nextOfKin?.relationship || ""} onChange={(v) => setKin("relationship", v)} required />
              <Field label="Next of kin phone" type="tel" numericOnly value={member.nextOfKin?.phone || ""} onChange={(v) => setKinNumeric("phone", v)} required />
              <Field label="Next of kin national ID" numericOnly value={member.nextOfKin?.nationalId || ""} onChange={(v) => setKinNumeric("nationalId", v)} />
            </div>
          </section>

          <section className="portal-panel profile-panel">
            <div className="profile-section-title">
              <UploadCloud size={18} />
              <h2>Member status</h2>
            </div>
            <div className="profile-status-box">
              <strong>{pct}% complete</strong>
              <p>{missing.length ? `Still missing: ${missing.join(", ")}` : "You are ready. Admins can see your full profile instantly."}</p>
              <button className="portal-btn" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
            </div>
          </section>
        </form>

        {pct === 100 && (
          <section className="profile-unlocked-panel">
            <span className="profile-unlocked-kicker">PROFILE COMPLETE</span>
            <h2>Congratulations — your profile is 100% complete.</h2>
            <p>Your data is now live for admins and superadmins, and your documents are safely stored in Cloudinary.</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false, required = false, numericOnly = false }) {
  const inputType = numericOnly ? "text" : type;
  return (
    <label className="portal-field">
      <span>{label}</span>
      <input
        type={inputType}
        value={value}
        disabled={disabled}
        required={required}
        inputMode={numericOnly ? "numeric" : undefined}
        pattern={numericOnly ? "[0-9]*" : undefined}
        onChange={(e) => {
          const nextValue = numericOnly ? String(e.target.value || "").replace(/\D+/g, "") : e.target.value;
          onChange?.(nextValue);
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <select value={value} required onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Agreement({ label, checked, onChange }) {
  return (
    <label className="profile-agreement">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function UploadCard({ title, hint, value, file, onFile, icon }) {
  const preview = file ? URL.createObjectURL(file) : value ? resolveApiUrl(value) : "";
  return (
    <div className="profile-upload-card">
      <div className="profile-upload-card-header">
        <span className="profile-upload-icon">{icon}</span>
        <div>
          <strong>{title}</strong>
          <p>{hint}</p>
        </div>
      </div>
      {preview ? (
        <a className="profile-upload-preview" href={preview} target="_blank" rel="noreferrer">
          <img src={preview} alt={title} />
        </a>
      ) : (
        <div className="profile-upload-empty">No file uploaded</div>
      )}
      <input type="file" accept="image/*,.pdf" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </div>
  );
}

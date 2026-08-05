import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getMemberProfile, updateMemberProfileWithPhoto } from "../../services/memberService";
import { resolveApiUrl } from "../../services/api";
import "./Profile.css";

const STATIONS = ["Chokaa", "Saika", "Ruaraka", "Garden City", "Garden Estate", "Jacaranda", "Depot", "None of above"];

export default function Profile() {
  const [member, setMember] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await getMemberProfile();
        setMember(response.member);
        setCompletion(response.profileCompletion);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key, value) => setMember((current) => ({ ...current, [key]: value }));
  const setKin = (key, value) => setMember((current) => ({ ...current, nextOfKin: { ...(current?.nextOfKin || {}), [key]: value } }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        phone: member?.phone || "",
        nationalId: member?.nationalId || "",
        gender: member?.gender || "",
        maritalStatus: member?.maritalStatus || "",
        dateOfBirth: member?.dateOfBirth || "",
        physicalAddress: member?.physicalAddress || "",
        siteStation: member?.siteStation || "",
        customSiteStation: member?.customSiteStation || "",
      };

      if (member?.siteStation === "None of above") {
        payload.nextOfKin = member?.nextOfKin || {};
      }

      const response = await updateMemberProfileWithPhoto(payload, { profileImage: photo });
      setMember(response.member);
      setCompletion(response.completion);
      setSuccess("Profile saved successfully.");
      setPhoto(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="portal-empty">Loading profile...</div></DashboardLayout>;
  }

  const pct = completion?.percentage || member?.profileCompletion || 0;
  const needsCustomStation = member?.siteStation === "None of above";

  return (
    <DashboardLayout>
      <div className="member-profile-page">
        <section className="profile-page-header">
          <div>
            <span>MEMBER PROFILE</span>
            <h1>Your profile</h1>
            <p>Only the information required for profile completion is collected here.</p>
          </div>
          <div className="profile-completion-badge">
            <strong>{pct}%</strong>
            <small>Complete</small>
          </div>
        </section>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-alert success">{success}</div>}

        {completion?.missingFields?.length > 0 && (
          <section className="portal-panel">
            <h2>Remaining items</h2>
            <p>{completion.missingFields.join(" • ")}</p>
          </section>
        )}

        <form className="portal-panel portal-form-grid" onSubmit={save}>
          <div className="portal-field">
            <span>Profile photo</span>
            {member?.profileImage && <img src={resolveApiUrl(member.profileImage)} alt="Profile" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />}
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>

          <Field label="Employee number" value={member?.memberNumber || ""} disabled />
          <Field label="Phone number" type="tel" value={member?.phone || ""} onChange={(v) => set("phone", v)} required />
          <Field label="National ID" value={member?.nationalId || ""} onChange={(v) => set("nationalId", v)} required />
          <Select label="Gender" value={member?.gender || ""} onChange={(v) => set("gender", v)} options={["Male", "Female", "Other"]} />
          <Select label="Marital status" value={member?.maritalStatus || ""} onChange={(v) => set("maritalStatus", v)} options={["Single", "Married", "Divorced", "Widowed"]} />
          <Field label="Date of Birth" type="date" value={member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().slice(0, 10) : ""} onChange={(v) => set("dateOfBirth", v)} required />
          <Field label="Physical Address" value={member?.physicalAddress || ""} onChange={(v) => set("physicalAddress", v)} required />
          <Select label="Site Station" value={member?.siteStation || ""} onChange={(v) => set("siteStation", v)} options={STATIONS} />

          {needsCustomStation && (
            <>
              <Field label="Your site station" value={member?.customSiteStation || ""} onChange={(v) => set("customSiteStation", v)} required />
              <Field label="Next of kin name" value={member?.nextOfKin?.fullName || ""} onChange={(v) => setKin("fullName", v)} required />
              <Field label="Next of kin relationship" value={member?.nextOfKin?.relationship || ""} onChange={(v) => setKin("relationship", v)} required />
              <Field label="Next of kin phone" type="tel" value={member?.nextOfKin?.phone || ""} onChange={(v) => setKin("phone", v)} required />
            </>
          )}

          <button className="portal-btn" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </form>

        {pct === 100 && (
          <section className="profile-unlocked-panel">
            <span className="profile-unlocked-kicker">PROFILE COMPLETE</span>
            <h2>Congratulations — your profile is 100% complete.</h2>
            <video autoPlay muted loop playsInline preload="metadata" style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 20 }}>
              <source src="/videos/benevolent-community-loop.mp4" type="video/mp4" />
            </video>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false, required = false }) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <input type={type} value={value} disabled={disabled} required={required} onChange={(e) => onChange?.(e.target.value)} />
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

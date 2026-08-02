import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Eye, EyeOff, LockKeyhole, Palette, Save, ShieldCheck } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  changeMemberPassword,
  getMemberSettings,
  updateMemberProfileWithPhoto,
  updateMemberSettings,
} from "../services/memberService";
import {
  changeAdminPassword,
  getAdminSettings,
  updateAdminProfile,
  updateAdminSettings,
} from "../services/adminService";
import {
  changeSuperAdminPassword,
  getSuperAdminSettings,
  updateSuperAdminProfile,
  updateSuperAdminSettings,
} from "../services/superAdminService";
import "./PortalSettings.css";

const THEMES = [
  { name: "Midax Orange", value: "#ff7a00" },
  { name: "Royal Violet", value: "#7c3aed" },
  { name: "Trust Blue", value: "#0ea5e9" },
  { name: "Community Green", value: "#10b981" },
  { name: "Warm Rose", value: "#e11d48" },
  { name: "Golden", value: "#f59e0b" },
];

export default function PortalSettings() {
  const { user, role, refreshUser } = useAuth();
  const fileRef = useRef(null);
  const normalizedRole = String(role || user?.role || "member").toLowerCase();

  const [profile, setProfile] = useState({
    fullName: user?.fullName || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  });
  const [themeColor, setThemeColor] = useState(user?.themeColor || "#ff7a00");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.profileImage || "");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isMember = normalizedRole === "member";
  const isAdmin = normalizedRole === "admin";

  const roleLabel = useMemo(
    () =>
      isMember ? "Member" : isAdmin ? "Administrator" : "Super Administrator",
    [isMember, isAdmin]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = isMember
          ? await getMemberSettings()
          : isAdmin
            ? await getAdminSettings()
            : await getSuperAdminSettings();

        if (!active) return;
        if (response?.settings?.themeColor) {
          setThemeColor(response.settings.themeColor);
        }
      } catch {
        // Defaults remain usable.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isMember, isAdmin]);

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5MB or smaller.");
      return;
    }

    setError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSavingProfile(true);

    try {
      let response;

      if (isMember) {
        response = await updateMemberProfileWithPhoto(
          {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            bio: profile.bio,
          },
          photo
        );
      } else if (isAdmin) {
        response = await updateAdminProfile(
          {
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
          },
          photo
        );
      } else {
        response = await updateSuperAdminProfile(
          {
            name: profile.fullName,
            email: profile.email,
          },
          photo
        );
      }

      await refreshUser();
      setPhoto(null);
      setMessage(response?.message || "Profile updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const saveTheme = async (value) => {
    setThemeColor(value);
    setError("");
    setMessage("");

    try {
      const response = isMember
        ? await updateMemberSettings({ themeColor: value })
        : isAdmin
          ? await updateAdminSettings({ themeColor: value })
          : await updateSuperAdminSettings({ themeColor: value });

      document.documentElement.style.setProperty("--portal-accent", value);
      document.documentElement.style.setProperty("--portal-accent-soft", `${value}18`);
      await refreshUser();
      setMessage(response?.message || "Portal appearance saved.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save appearance."
      );
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = passwords;
      const response = isMember
        ? await changeMemberPassword(payload)
        : isAdmin
          ? await changeAdminPassword(payload)
          : await changeSuperAdminPassword(payload);

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage(response?.message || "Password changed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to change password."
      );
    }
  };

  const imageSrc = photoPreview
    ? resolveApiUrl(photoPreview)
    : "";

  return (
    <DashboardLayout>
      <div className="portal-settings-page">
        <header className="portal-settings-header">
          <div>
            <span>ACCOUNT CONTROL</span>
            <h1>Settings & Preferences</h1>
            <p>
              Personalize your {roleLabel.toLowerCase()} portal while keeping
              your account secure.
            </p>
          </div>
          <ShieldCheck size={38} />
        </header>

        {message && <div className="settings-message success">{message}</div>}
        {error && <div className="settings-message error">{error}</div>}

        <div className="portal-settings-grid">
          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div className="settings-icon"><Camera size={20} /></div>
              <div>
                <span>PROFILE</span>
                <h2>Profile photo & information</h2>
              </div>
            </div>

            <form onSubmit={saveProfile}>
              <div className="profile-photo-row">
                <div className="large-profile-avatar">
                  {imageSrc ? (
                    <img src={imageSrc} alt="Profile" />
                  ) : (
                    <span>
                      {(profile.fullName || "B").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={selectPhoto}
                  />
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera size={17} />
                    Upload profile photo
                  </button>
                  <p className="settings-hint">
                    JPG, PNG or WEBP · maximum 5MB
                  </p>
                </div>
              </div>

              <div className="settings-form-grid">
                <Field
                  label={isMember ? "Full name" : "Display name"}
                  value={profile.fullName}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, fullName: value }))
                  }
                />
                <Field
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, email: value }))
                  }
                />
                {!normalizedRole.startsWith("super") && (
                  <Field
                    label="Phone"
                    value={profile.phone}
                    onChange={(value) =>
                      setProfile((p) => ({ ...p, phone: value }))
                    }
                  />
                )}
                {isMember && (
                  <div className="settings-field full">
                    <label>Bio</label>
                    <textarea
                      rows="4"
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, bio: e.target.value }))
                      }
                      placeholder="Tell your community a little about yourself."
                    />
                  </div>
                )}
              </div>

              <button className="settings-primary-btn" disabled={savingProfile}>
                <Save size={17} />
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </form>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div className="settings-icon"><Palette size={20} /></div>
              <div>
                <span>APPEARANCE</span>
                <h2>Choose your portal colour</h2>
              </div>
            </div>

            <p className="settings-description">
              Pick the accent that feels right for your portal. Your choice is
              saved to your account.
            </p>

            <div className="theme-options">
              {THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.value}
                  className={`theme-option ${themeColor === theme.value ? "selected" : ""}`}
                  onClick={() => saveTheme(theme.value)}
                >
                  <span
                    className="theme-swatch"
                    style={{ background: theme.value }}
                  />
                  <span>{theme.name}</span>
                  {themeColor === theme.value && <Check size={17} />}
                </button>
              ))}
            </div>

            {loading && <small>Loading saved preferences...</small>}
          </section>

          <section className="settings-panel security-panel">
            <div className="settings-panel-heading">
              <div className="settings-icon"><LockKeyhole size={20} /></div>
              <div>
                <span>SECURITY</span>
                <h2>Change login password</h2>
              </div>
            </div>

            <form onSubmit={changePassword}>
              <PasswordField
                label="Current password"
                value={passwords.currentPassword}
                show={showPasswords}
                onToggle={() => setShowPasswords((v) => !v)}
                onChange={(value) =>
                  setPasswords((p) => ({ ...p, currentPassword: value }))
                }
              />
              <PasswordField
                label="New password"
                value={passwords.newPassword}
                show={showPasswords}
                onToggle={() => setShowPasswords((v) => !v)}
                onChange={(value) =>
                  setPasswords((p) => ({ ...p, newPassword: value }))
                }
              />
              <PasswordField
                label="Confirm new password"
                value={passwords.confirmPassword}
                show={showPasswords}
                onToggle={() => setShowPasswords((v) => !v)}
                onChange={(value) =>
                  setPasswords((p) => ({ ...p, confirmPassword: value }))
                }
              />

              <button className="settings-primary-btn" type="submit">
                <LockKeyhole size={17} />
                Change password
              </button>
            </form>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, type = "text", value, onChange }) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }) {
  return (
    <div className="settings-field password-field">
      <label>{label}</label>
      <div>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button type="button" onClick={onToggle} aria-label="Toggle password visibility">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

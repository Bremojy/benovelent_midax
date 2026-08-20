import { useState } from "react";

import DashboardLayout from "../../layouts/DashboardLayout";
import NotificationSettings from "../../components/NotificationSettings";
import useMemberDashboard from "../../hooks/useMemberDashboard";
import { updateMemberProfile, changeMemberPassword } from "../../services/memberService";

import {
  User,
  Phone,
  Mail,
  Lock,
  Camera,
  Save,
  ShieldCheck,
} from "lucide-react";

import "./Settings.css";

function Settings() {

  const {
    member,
    loading,
    error,
  } = useMemberDashboard();

  const [form, setForm] = useState({
    fullName: member?.fullName || "",
    phone: member?.phone || "",
    email: member?.email || "",
    bio: member?.bio || "",
    password: "",
    confirmPassword: "",
  });

  if (loading) {
    return (
      <DashboardLayout>
        <h2>Loading Settings...</h2>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <h2>{error}</h2>
      </DashboardLayout>
    );
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setSaveError("");

    try {
      await updateMemberProfile({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        bio: form.bio,
      });

      if (form.password || form.confirmPassword) {
        if (form.password !== form.confirmPassword) {
          throw new Error("New password and confirmation do not match.");
        }
        await changeMemberPassword({
          currentPassword: form.currentPassword || "",
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        });
      }

      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
        currentPassword: "",
      }));
      setMessage("Your account settings were updated successfully.");
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (

    <DashboardLayout>

      <div className="settings-page">

        <NotificationSettings />

        <div className="settings-header">

          <h1>

            Account Settings

          </h1>

          <p>

            Update your personal information.

          </p>

        </div>

        <form
          className="settings-card"
          onSubmit={saveSettings}
        >

          <div className="profile-picture">

            <div className="picture-circle">

              {member?.fullName
                ?.charAt(0)
                ?.toUpperCase() || "M"}

            </div>

            <button
              type="button"
              className="upload-btn"
            >

              <Camera size={18} />

              Change Photo

            </button>

          </div>

          <div className="settings-grid">

            <div className="input-box">

              <label>

                <User size={16} />

                Full Name

              </label>

              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
              />

            </div>

            <div className="input-box">

              <label>

                <Phone size={16} />

                Phone

              </label>

              <input
                type="tel"
                inputMode="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />

            </div>

            <div className="input-box">

              <label>

                <Mail size={16} />

                Email

              </label>

              <input
                name="email"
                value={form.email}
                onChange={handleChange}
              />

            </div>

            <div className="input-box">

              <label>

                <ShieldCheck size={16} />

                Bio

              </label>

              <textarea
                rows="4"
                name="bio"
                value={form.bio}
                onChange={handleChange}
              />

            </div>

            <div className="input-box">

              <label>

                <Lock size={16} />

                Current Password

              </label>

              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword || ""}
                onChange={handleChange}
                placeholder="Required when changing password"
              />

            </div>

            <div className="input-box">

              <label>

                <Lock size={16} />

                New Password

              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
              />

            </div>

            <div className="input-box">

              <label>

                <Lock size={16} />

                Confirm Password

              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
              />

            </div>

          </div>

          {saveError && <div className="settings-alert error">{saveError}</div>}
          {message && <div className="settings-alert success">{message}</div>}

          <button
            className="save-settings-btn"
            disabled={saving}
            type="submit"
          >

            <Save size={18} />

            Save Changes

          </button>

        </form>

      </div>

    </DashboardLayout>

  );

}

export default Settings;
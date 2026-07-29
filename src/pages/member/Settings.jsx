import { useState } from "react";

import DashboardLayout from "../../layouts/DashboardLayout";
import useMemberDashboard from "../../hooks/useMemberDashboard";

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

  const saveSettings = (e) => {
    e.preventDefault();

    alert(
      "Backend profile update will be connected in the next step."
    );
  };

  return (

    <DashboardLayout>

      <div className="settings-page">

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

          <button
            className="save-settings-btn"
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
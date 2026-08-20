import { useEffect, useState } from "react";

import {
  getSettings,
  updateSettings,
} from "../services/settingsService";

export default function useSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    language: "English",
    phone: "",
    email: "",
    address: "",
    bio: "",
    profileVisibility: "Members Only",
  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);

      const res = await getSettings();

      if (res.success) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.debug("Unable to load settings:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);

      const res = await updateSettings(settings);

      if (res.success) {
        setMessage("Settings updated successfully.");
      }
    } catch (err) {
      setMessage("Unable to save settings.");
    } finally {
      setSaving(false);

      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  }

  return {
    settings,
    setSettings,
    loading,
    saving,
    message,
    saveSettings,
  };
}
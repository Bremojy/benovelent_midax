import { useEffect, useState } from "react";
import API from "../services/api";

export function usePublicSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    API.get("/website/settings")
      .then(({ data }) => { if (active) setSettings(data?.settings || null); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load current website settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { settings, loading, error };
}

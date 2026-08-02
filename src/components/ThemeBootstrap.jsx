import { useEffect } from "react";
import API from "../services/api";

function applyTheme(color) {
  if (!color || typeof document === "undefined") return;
  document.documentElement.style.setProperty("--orange", color);
  document.documentElement.style.setProperty("--orange-dark", color);
  document.documentElement.style.setProperty("--portal-accent", color);
  document.documentElement.style.setProperty("--portal-accent-soft", `${color}18`);
}

export default function ThemeBootstrap() {
  useEffect(() => {
    let active = true;

    const loadTheme = async () => {
      try {
        const { data } = await API.get("/website/settings");
        const settings = data?.section?.content || data?.section?.settings || data?.content || {};
        const color =
          settings?.themeColor ||
          settings?.accentColor ||
          settings?.primaryColor ||
          data?.section?.themeColor;
        if (active && color) {
          applyTheme(color);
        }
      } catch (error) {
        // Keep the built-in theme if the settings section is not available yet.
      }
    };

    loadTheme();
    return () => {
      active = false;
    };
  }, []);

  return null;
}

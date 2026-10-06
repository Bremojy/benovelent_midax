import { useEffect } from "react";
import API from "../services/api";
import { applyTheme } from "../utils/theme";

export default function ThemeBootstrap() {
  useEffect(() => {
    const appearance = localStorage.getItem("benovelentMidaxAppearance") || "light";
    document.documentElement.setAttribute("data-appearance", appearance);
    let active = true;

    const loadTheme = async () => {
      try {
        const { data } = await API.get("/website/settings");
        const settings = data?.section?.content || data?.settings || data?.content || data?.section || {};
        const branding = settings?.branding || data?.branding || {};
        if (active) applyTheme(branding);
      } catch (_) {
        if (active) applyTheme({});
      }
    };

    loadTheme();
    return () => { active = false; };
  }, []);

  return null;
}

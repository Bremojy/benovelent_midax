import { useEffect, useState } from "react";
import API from "../services/api";

export function usePublicWebsiteSection(section) {
  const [state, setState] = useState({ section: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    if (!section) {
      setState({ section: null, loading: false, error: "" });
      return () => { active = false; };
    }

    setState((previous) => ({ ...previous, loading: true, error: "" }));
    API.get(`/website/${section}`)
      .then(({ data }) => {
        if (active) setState({ section: data?.section || null, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setState({ section: null, loading: false, error: error.response?.data?.message || "Unable to load published website content." });
      });

    return () => { active = false; };
  }, [section]);

  return state;
}

export default usePublicWebsiteSection;

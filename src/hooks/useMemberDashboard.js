import { useState, useEffect, useCallback } from "react";
import { getMemberDashboard } from "../services/memberService";

function useMemberDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [member, setMember] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMemberDashboard();

      if (response.success) {
        setDashboard(response.dashboard);
        setMember(response.dashboard.member);
        setStatistics(response.dashboard.statistics);
      } else {
        setError(response.message || "Failed to load dashboard.");
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    dashboard,
    member,
    statistics,
    loading,
    error,
    refreshDashboard: loadDashboard,
  };
}

export default useMemberDashboard;
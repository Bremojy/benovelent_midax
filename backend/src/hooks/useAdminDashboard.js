import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminDashboard,
  getRecentMembers,
} from "../services/adminService";

// ========================================
// ADMIN DASHBOARD HOOK
// ========================================

function useAdminDashboard() {
  const [dashboard, setDashboard] =
    useState(null);

  const [recentMembers, setRecentMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================
  // FETCH DASHBOARD
  // ======================================

  const fetchDashboard =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardResponse,
          recentMembersResponse,
        ] = await Promise.all([
          getAdminDashboard(),
          getRecentMembers(),
        ]);

        // ----------------------------------
        // DASHBOARD DATA
        // ----------------------------------

        if (
          dashboardResponse?.success
        ) {
          setDashboard(
            dashboardResponse.dashboard || {}
          );
        } else {
          throw new Error(
            dashboardResponse?.message ||
              "Unable to load dashboard."
          );
        }

        // ----------------------------------
        // RECENT MEMBERS
        // ----------------------------------

        if (
          recentMembersResponse?.success
        ) {
          setRecentMembers(
            recentMembersResponse.members ||
              []
          );
        } else {
          setRecentMembers([]);
        }

      } catch (err) {
        console.error(
          "Admin dashboard error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load admin dashboard."
        );

        setDashboard(null);
        setRecentMembers([]);

      } finally {
        setLoading(false);
      }
    }, []);

  // ======================================
  // INITIAL LOAD
  // ======================================

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) return;

      await fetchDashboard();
    };

    load();

    return () => {
      mounted = false;
    };
  }, [fetchDashboard]);

  // ======================================
  // REFRESH
  // ======================================

  const refreshDashboard =
    useCallback(async () => {
      await fetchDashboard();
    }, [fetchDashboard]);

  // ======================================
  // RETURN
  // ======================================

  return {
    dashboard,
    recentMembers,
    loading,
    error,
    refreshDashboard,
  };
}

export default useAdminDashboard;

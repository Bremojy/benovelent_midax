import {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  getMemberDashboard,
} from "../services/memberService";

function useMemberDashboard() {
  const [dashboard, setDashboard] =
    useState(null);

  const [member, setMember] =
    useState(null);

  const [statistics, setStatistics] =
    useState(null);

  const [benefits, setBenefits] =
    useState(null);

  const [announcements, setAnnouncements] =
    useState([]);

  const [recentContributions, setRecentContributions] =
    useState([]);

  const [profileCompletion, setProfileCompletion] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getMemberDashboard();

        if (
          !response ||
          !response.success
        ) {
          throw new Error(
            response?.message ||
              "Failed to load member dashboard."
          );
        }

        const data =
          response.dashboard || {};

        setDashboard(data);

        setMember(
          data.member || null
        );

        setStatistics(
          data.statistics || null
        );

        setBenefits(
          data.benefits || null
        );

        setAnnouncements(
          Array.isArray(
            data.announcements
          )
            ? data.announcements
            : []
        );

        setRecentContributions(
          Array.isArray(
            data.recentContributions
          )
            ? data.recentContributions
            : []
        );

        setProfileCompletion(
          data.profileCompletion ||
            null
        );

      } catch (err) {
        console.error(
          "Member dashboard error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load your dashboard."
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

    benefits,

    announcements,

    recentContributions,

    profileCompletion,

    loading,

    error,

    refreshDashboard:
      loadDashboard,
  };
}

export default useMemberDashboard;
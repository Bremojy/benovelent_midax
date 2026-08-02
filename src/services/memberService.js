import API from "./api";

// =======================================
// MEMBER DASHBOARD
// =======================================

export const getMemberDashboard = async () => {
  const { data } = await API.get(
    "/member/dashboard"
  );

  return data;
};

// =======================================
// MEMBER PROFILE
// =======================================

export const getMemberProfile = async () => {
  const { data } = await API.get(
    "/member/profile"
  );

  return data;
};

export const updateMemberProfile = async (profile) => {
  const { data } = await API.put("/member/profile", profile);
  return data;
};

export const updateMemberProfileWithPhoto = async (profile, photo) => {
  const formData = new FormData();

  Object.entries(profile || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  if (photo) {
    formData.append("profileImage", photo);
  }

  const { data } = await API.put("/member/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

// =======================================
// MEMBER SUMMARY
// =======================================

export const getMemberSummary = async () => {
  const { data } = await API.get(
    "/member/summary"
  );

  return data;
};

// =======================================
// PROFILE STATUS
// =======================================

export const getMemberProfileStatus =
  async () => {
    const { data } = await API.get(
      "/member/profile-status"
    );

    return data;
  };

// =======================================
// BENEFIT ELIGIBILITY
// =======================================

export const getMemberEligibility =
  async () => {
    const { data } = await API.get(
      "/member/eligibility"
    );

    return data;
  };

// =======================================
// SETTINGS
// =======================================

export const getMemberSettings = async () => {
  const { data } = await API.get(
    "/member/settings"
  );

  return data;
};

export const updateMemberSettings =
  async (settings) => {
    const { data } = await API.put(
      "/member/settings",
      settings
    );

    return data;
  };

// =======================================
// CHANGE PASSWORD
// =======================================

export const changeMemberPassword =
  async ({
    currentPassword,
    newPassword,
    confirmPassword,
  }) => {
    const { data } = await API.put(
      "/member/change-password",
      {
        currentPassword,
        newPassword,
        confirmPassword,
      }
    );

    return data;
  };

// =======================================
// CONTRIBUTIONS
// =======================================

export const getMemberContributions =
  async () => {
    const { data } =
      await API.get(
        "/member/contributions"
      );

    return data;
  };


export const getMemberFinance = async () => {
  const { data } = await API.get("/member/finance");
  return data;
};

// =======================================
// MEMBER BENEFITS
// =======================================

export const getMemberBenefits =
  async () => {
    const { data } =
      await API.get(
        "/member/benefits"
      );

    return data;
  };


// =======================================
// MEMBER ELIGIBILITY
// =======================================

export const getMemberEligibilityDetails =
  async () => {
    const { data } =
      await API.get(
        "/member/eligibility"
      );

    return data;
  };


// =======================================
// MEMBER CLAIMS / SUPPORT REQUESTS
// =======================================

export const getMemberClaims =
  async () => {
    const { data } =
      await API.get(
        "/member/claims"
      );

    return data;
  };


// =======================================
// CREATE SUPPORT REQUEST
// =======================================

export const createMemberClaim =
  async (claim) => {
    const { data } =
      await API.post(
        "/member/claims",
        claim
      );

    return data;
  };


// =======================================
// DEPENDENTS
// =======================================
export const getMemberDependents = async () => {
  const { data } = await API.get("/dependents/my");
  return data;
};

// =======================================
// MEMBER NEWS
// =======================================

export const getMemberNews =
  async () => {
    const { data } =
      await API.get(
        "/news"
      );

    return data;
  };


// =======================================
// POLLS
// =======================================

export const getMemberPolls =
  async () => {
    const { data } =
      await API.get(
        "/polls"
      );

    return data;
  };


// =======================================
// VOTE
// =======================================

export const voteInPoll =
  async (pollId, optionId) => {
    const { data } =
      await API.post(
        `/votes/${pollId}`,
        { selectedOptions: [optionId] }
      );

    return data;
  };

import API from "./api";

// ========================================
// ADMIN DASHBOARD
// ========================================

export const getAdminDashboard = async () => {
  const { data } = await API.get(
    "/admin/dashboard"
  );

  return data;
};


// ========================================
// MEMBER STATISTICS
// ========================================

export const getMemberStatistics = async () => {
  const { data } = await API.get(
    "/admin/members/statistics"
  );

  return data;
};


// ========================================
// RECENT MEMBERS
// ========================================

export const getRecentMembers = async () => {
  const { data } = await API.get(
    "/admin/members/recent"
  );

  return data;
};


// ========================================
// FILTER MEMBERS
// ========================================

export const filterAdminMembers = async ({
  status = "",
  department = "",
  page = 1,
  limit = 10,
} = {}) => {
  const { data } = await API.get(
    "/admin/members/filter",
    {
      params: {
        status,
        department,
        page,
        limit,
      },
    }
  );

  return data;
};


// ========================================
// MONTHLY REGISTRATIONS
// ========================================

export const getMonthlyRegistrations =
  async () => {
    const { data } = await API.get(
      "/admin/members/monthly-registrations"
    );

    return data;
  };


// ========================================
// CONTRIBUTION SUMMARY
// ========================================

export const getContributionSummary =
  async () => {
    const { data } = await API.get(
      "/admin/members/contribution-summary"
    );

    return data;
  };


// ========================================
// GET MEMBERS
// ========================================

export const getAdminMembers = async ({
  page = 1,
  limit = 10,
  search = "",
} = {}) => {
  const { data } = await API.get(
    "/admin/members",
    {
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return data;
};


// ========================================
// GET SINGLE MEMBER
// ========================================

export const getAdminMember = async (
  memberId
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  const { data } = await API.get(
    `/admin/members/${memberId}`
  );

  return data;
};


// ========================================
// CREATE MEMBER
// ========================================

export const createAdminMember = async (
  memberData
) => {
  if (!memberData) {
    throw new Error(
      "Member information is required."
    );
  }

  const { data } = await API.post(
    "/admin/members",
    memberData
  );

  return data;
};


// ========================================
// UPDATE MEMBER
// ========================================

export const updateAdminMember = async (
  memberId,
  memberData
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  if (!memberData) {
    throw new Error(
      "Member information is required."
    );
  }

  const { data } = await API.put(
    `/admin/members/${memberId}`,
    memberData
  );

  return data;
};


// ========================================
// DELETE MEMBER
// ========================================

export const deleteAdminMember = async (
  memberId
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  const { data } = await API.delete(
    `/admin/members/${memberId}`
  );

  return data;
};


// ========================================
// SUSPEND MEMBER
// ========================================

export const suspendAdminMember = async (
  memberId
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  const { data } = await API.patch(
    `/admin/members/${memberId}/suspend`
  );

  return data;
};


// ========================================
// ACTIVATE MEMBER
// ========================================

export const activateAdminMember = async (
  memberId
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  const { data } = await API.patch(
    `/admin/members/${memberId}/activate`
  );

  return data;
};


// ========================================
// RESTORE MEMBER
// ========================================

export const restoreAdminMember = async (
  memberId
) => {
  if (!memberId) {
    throw new Error(
      "Member ID is required."
    );
  }

  const { data } = await API.patch(
    `/admin/members/${memberId}/restore`
  );

  return data;
};


// ========================================
// RESET MEMBER PASSWORD
// ========================================

export const resetAdminMemberPassword =
  async (memberId) => {
    if (!memberId) {
      throw new Error(
        "Member ID is required."
      );
    }

    const { data } = await API.patch(
      `/admin/members/${memberId}/reset-password`
    );

    return data;
  };

// ========================================
// SUPERADMIN - GET ADMINS
// ========================================

export const getSuperAdminAdmins = async ({
  page = 1,
  limit = 10,
  search = "",
} = {}) => {
  const { data } = await API.get(
    "/superadmin/admins",
    {
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return data;
};


// ========================================
// SUPERADMIN - GET ADMIN
// ========================================

export const getSuperAdminAdmin = async (
  adminId
) => {
  if (!adminId) {
    throw new Error(
      "Admin ID is required."
    );
  }

  const { data } = await API.get(
    `/superadmin/admins/${adminId}`
  );

  return data;
};


// ========================================
// SUPERADMIN - CREATE ADMIN
// ========================================

export const createSuperAdminAdmin =
  async (adminData) => {
    if (!adminData) {
      throw new Error(
        "Administrator information is required."
      );
    }

    const { data } = await API.post(
      "/superadmin/admins",
      adminData
    );

    return data;
  };


// ========================================
// SUPERADMIN - UPDATE ADMIN
// ========================================

export const updateSuperAdminAdmin =
  async (
    adminId,
    adminData
  ) => {
    if (!adminId) {
      throw new Error(
        "Admin ID is required."
      );
    }

    if (!adminData) {
      throw new Error(
        "Administrator information is required."
      );
    }

    const { data } = await API.put(
      `/superadmin/admins/${adminId}`,
      adminData
    );

    return data;
  };


// ========================================
// SUPERADMIN - SUSPEND ADMIN
// ========================================

export const suspendSuperAdminAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Admin ID is required."
      );
    }

    const { data } = await API.patch(
      `/superadmin/admins/${adminId}/suspend`
    );

    return data;
  };


// ========================================
// SUPERADMIN - ACTIVATE ADMIN
// ========================================

export const activateSuperAdminAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Admin ID is required."
      );
    }

    const { data } = await API.patch(
      `/superadmin/admins/${adminId}/activate`
    );

    return data;
  };


// ========================================
// SUPERADMIN - RESET PASSWORD
// ========================================

export const resetSuperAdminAdminPassword =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Admin ID is required."
      );
    }

    const { data } = await API.patch(
      `/superadmin/admins/${adminId}/reset-password`
    );

    return data;
  };


// ========================================
// SUPERADMIN - DELETE ADMIN
// ========================================

export const deleteSuperAdminAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Admin ID is required."
      );
    }

    const { data } = await API.delete(
      `/superadmin/admins/${adminId}`
    );

    return data;
  };


// ========================================
// SUPERADMIN - STATISTICS
// ========================================

export const getSuperAdminAdminStatistics =
  async () => {
    const { data } = await API.get(
      "/superadmin/admins/statistics"
    );

    return data;
  };


// ========================================
// ADMIN PROFILE / SETTINGS
// ========================================

export const getAdminProfile = async () => {
  const { data } = await API.get("/admin/profile");
  return data;
};

export const updateAdminProfile = async (profile, photo) => {
  const formData = new FormData();
  Object.entries(profile || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (photo) formData.append("profileImage", photo);

  const { data } = await API.put("/admin/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const changeAdminPassword = async (payload) => {
  const { data } = await API.put("/admin/change-password", payload);
  return data;
};

export const getAdminSettings = async () => {
  const { data } = await API.get("/admin/settings");
  return data;
};

export const updateAdminSettings = async (settings) => {
  const { data } = await API.put("/admin/settings", settings);
  return data;
};

// ========================================
// DEFAULT EXPORT
// ========================================

export default {
  getAdminDashboard,
  getMemberStatistics,
  getRecentMembers,
  filterAdminMembers,
  getMonthlyRegistrations,
  getContributionSummary,
  getAdminMembers,
  getAdminMember,
  createAdminMember,
  updateAdminMember,
  deleteAdminMember,
  suspendAdminMember,
  activateAdminMember,
  restoreAdminMember,
  resetAdminMemberPassword,

  // SUPERADMIN ADMIN MANAGEMENT
  getSuperAdminAdmins,
  getSuperAdminAdmin,
  createSuperAdminAdmin,
  updateSuperAdminAdmin,
  suspendSuperAdminAdmin,
  activateSuperAdminAdmin,
  resetSuperAdminAdminPassword,
  deleteSuperAdminAdmin,
  getSuperAdminAdminStatistics,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAdminSettings,
  updateAdminSettings,
};


// ========================================
// ADMIN DIRECTORY
// ========================================

export const getAdminColleagues = async () => {
  const { data } = await API.get("/admin/colleagues");
  return data;
};

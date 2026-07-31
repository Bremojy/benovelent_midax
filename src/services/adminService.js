
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
  const { data } = await API.delete(
    `/admin/members/${memberId}`
  );

  return data;
};
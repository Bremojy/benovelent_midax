import API from "./api";

// ======================================================
// GET ADMIN STATISTICS
// ======================================================

export const getSuperAdminAdminStatistics =
  async () => {
    const { data } =
      await API.get(
        "/superadmin/admins/statistics"
      );

    return data;
  };


// ======================================================
// GET ALL ADMINS
// ======================================================

export const getSuperAdmins =
  async ({
    page = 1,
    limit = 10,
    search = "",
  } = {}) => {
    const { data } =
      await API.get(
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


// ======================================================
// GET SINGLE ADMIN
// ======================================================

export const getSuperAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    const { data } =
      await API.get(
        `/superadmin/admins/${adminId}`
      );

    return data;
  };


// ======================================================
// CREATE ADMIN
// ======================================================

export const createSuperAdmin =
  async (adminData) => {
    if (!adminData) {
      throw new Error(
        "Administrator information is required."
      );
    }

    const { data } =
      await API.post(
        "/superadmin/admins",
        adminData
      );

    return data;
  };


// ======================================================
// UPDATE ADMIN
// ======================================================

export const updateSuperAdmin =
  async (
    adminId,
    adminData
  ) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    if (!adminData) {
      throw new Error(
        "Administrator information is required."
      );
    }

    const { data } =
      await API.put(
        `/superadmin/admins/${adminId}`,
        adminData
      );

    return data;
  };


// ======================================================
// SUSPEND ADMIN
// ======================================================

export const suspendSuperAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    const { data } =
      await API.patch(
        `/superadmin/admins/${adminId}/suspend`
      );

    return data;
  };


// ======================================================
// ACTIVATE ADMIN
// ======================================================

export const activateSuperAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    const { data } =
      await API.patch(
        `/superadmin/admins/${adminId}/activate`
      );

    return data;
  };


// ======================================================
// RESET ADMIN PASSWORD
// ======================================================

export const resetSuperAdminPassword =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    const { data } =
      await API.patch(
        `/superadmin/admins/${adminId}/reset-password`
      );

    return data;
  };


// ======================================================
// DELETE ADMIN
// ======================================================

export const deleteSuperAdmin =
  async (adminId) => {
    if (!adminId) {
      throw new Error(
        "Administrator ID is required."
      );
    }

    const { data } =
      await API.delete(
        `/superadmin/admins/${adminId}`
      );

    return data;
  };


// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  getSuperAdminAdminStatistics,
  getSuperAdmins,
  getSuperAdmin,
  createSuperAdmin,
  updateSuperAdmin,
  suspendSuperAdmin,
  activateSuperAdmin,
  resetSuperAdminPassword,
  deleteSuperAdmin,
};
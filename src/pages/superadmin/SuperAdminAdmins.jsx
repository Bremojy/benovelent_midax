import "./SuperAdminAdmins.css";

import { useEffect, useState } from "react";

import {
  UserPlus,
  Search,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Edit3,
  UserX,
  UserCheck,
  KeyRound,
  Trash2,
  RefreshCw,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createSuperAdminAdmin,
  getSuperAdminAdmins,
  updateSuperAdminAdmin,
  suspendSuperAdminAdmin,
  activateSuperAdminAdmin,
  resetSuperAdminAdminPassword,
  deleteSuperAdminAdmin,
  getSuperAdminAdminStatistics,
} from "../../services/adminService";

function SuperAdminAdmins() {
  // ==================================================
  // STATE
  // ==================================================

  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statistics, setStatistics] =
    useState({
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
    });

  // ==================================================
  // CREATE / EDIT MODAL
  // ==================================================

  const [showModal, setShowModal] =
    useState(false);

  const [editingAdmin, setEditingAdmin] =
    useState(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  // ==================================================
  // ACTION MENU
  // ==================================================

  const [openMenu, setOpenMenu] =
    useState(null);

  // ==================================================
  // CONFIRMATION MODAL
  // ==================================================

  const [confirmation, setConfirmation] =
    useState(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  // ==================================================
  // RESET PASSWORD RESULT
  // ==================================================

  const [temporaryPassword, setTemporaryPassword] =
    useState("");

  // ==================================================
  // MESSAGE
  // ==================================================

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  // ==================================================
  // FORM
  // ==================================================

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
  });

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadData();
  }, []);

  // ==================================================
  // LOAD EVERYTHING
  // ==================================================

  async function loadData() {
    try {
      setLoading(true);

      await Promise.all([
        loadAdmins(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error(
        "Load Super Admin data error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // LOAD ADMINS
  // ==================================================

  async function loadAdmins() {
    try {
      const response =
        await getSuperAdminAdmins({
          page: 1,
          limit: 100,
          search: "",
        });

      if (Array.isArray(response)) {
        setAdmins(response);
      } else if (
        Array.isArray(response?.admins)
      ) {
        setAdmins(response.admins);
      } else if (
        Array.isArray(response?.data)
      ) {
        setAdmins(response.data);
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error(
        "Load administrators error:",
        error
      );

      throw error;
    }
  }

  // ==================================================
  // LOAD STATISTICS
  // ==================================================

  async function loadStatistics() {
    try {
      const response =
        await getSuperAdminAdminStatistics();

      if (response?.statistics) {
        setStatistics(
          response.statistics
        );
      }
    } catch (error) {
      console.error(
        "Load administrator statistics error:",
        error
      );
    }
  }

  // ==================================================
  // REFRESH
  // ==================================================

  async function handleRefresh() {
    try {
      setRefreshing(true);

      await Promise.all([
        loadAdmins(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }

  // ==================================================
  // FORM CHANGE
  // ==================================================

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (message.type === "error") {
      setMessage({
        type: "",
        text: "",
      });
    }
  }

  // ==================================================
  // OPEN CREATE
  // ==================================================

  function openCreateModal() {
    setEditingAdmin(null);

    setForm({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      status: "active",
    });

    setShowPassword(false);

    setMessage({
      type: "",
      text: "",
    });

    setShowModal(true);
  }

  // ==================================================
  // OPEN EDIT
  // ==================================================

  function openEditModal(admin) {
    setEditingAdmin(admin);

    setForm({
      fullName:
        admin.fullName ||
        admin.name ||
        "",
      email:
        admin.email || "",
      phone:
        admin.phone || "",
      password: "",
      status:
        admin.status ||
        "active",
    });

    setShowPassword(false);

    setMessage({
      type: "",
      text: "",
    });

    setOpenMenu(null);

    setShowModal(true);
  }

  // ==================================================
  // CLOSE MODAL
  // ==================================================

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);

    setEditingAdmin(null);

    setShowPassword(false);

    setMessage({
      type: "",
      text: "",
    });
  }

  // ==================================================
  // CREATE / UPDATE ADMIN
  // ==================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    const fullName =
      form.fullName.trim();

    const email =
      form.email.trim().toLowerCase();

    const phone =
      form.phone.trim();

    const password =
      form.password;

    // ----------------------------------------------
    // VALIDATION
    // ----------------------------------------------

    if (!fullName) {
      setMessage({
        type: "error",
        text: "Full name is required.",
      });

      return;
    }

    if (!email) {
      setMessage({
        type: "error",
        text:
          "Email address is required.",
      });

      return;
    }

    if (!phone) {
      setMessage({
        type: "error",
        text:
          "Phone number is required.",
      });

      return;
    }

    // Password required only during creation

    if (!editingAdmin && !password) {
      setMessage({
        type: "error",
        text:
          "Temporary password is required.",
      });

      return;
    }

    if (
      !editingAdmin &&
      password.length < 6
    ) {
      setMessage({
        type: "error",
        text:
          "Password must contain at least 6 characters.",
      });

      return;
    }

    try {
      setSubmitting(true);

      // ============================================
      // UPDATE
      // ============================================

      if (editingAdmin) {
        const response =
          await updateSuperAdminAdmin(
            editingAdmin._id,
            {
              fullName,
              email,
              phone,
              status:
                form.status,
            }
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to update administrator."
          );
        }

        setMessage({
          type: "success",
          text:
            response.message ||
            "Administrator updated successfully.",
        });

      }

      // ============================================
      // CREATE
      // ============================================

      else {
        const response =
          await createSuperAdminAdmin({
            fullName,
            email,
            phone,
            password,
          });

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to create administrator."
          );
        }

        setMessage({
          type: "success",
          text:
            response.message ||
            "Administrator created successfully.",
        });
      }

      // ============================================
      // REFRESH DATA
      // ============================================

      await Promise.all([
        loadAdmins(),
        loadStatistics(),
      ]);

      // ============================================
      // RESET
      // ============================================

      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        status: "active",
      });

      setTimeout(() => {
        setShowModal(false);
        setEditingAdmin(null);

        setMessage({
          type: "",
          text: "",
        });
      }, 1000);

    } catch (error) {
      console.error(
        "Save administrator error:",
        error
      );

      setMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save administrator.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // SUSPEND
  // ==================================================

  function confirmSuspend(admin) {
    setOpenMenu(null);

    setConfirmation({
      type: "suspend",
      admin,
      title:
        "Suspend Administrator?",
      message:
        `${getAdminName(admin)} will no longer be able to access the administrator portal.`,
    });
  }

  // ==================================================
  // ACTIVATE
  // ==================================================

  function confirmActivate(admin) {
    setOpenMenu(null);

    setConfirmation({
      type: "activate",
      admin,
      title:
        "Activate Administrator?",
      message:
        `${getAdminName(admin)} will regain access to the administrator portal.`,
    });
  }

  // ==================================================
  // DELETE
  // ==================================================

  function confirmDelete(admin) {
    setOpenMenu(null);

    setConfirmation({
      type: "delete",
      admin,
      title:
        "Delete Administrator?",
      message:
        `This will permanently remove ${getAdminName(
          admin
        )}'s administrator account. This action cannot be undone.`,
    });
  }

  // ==================================================
  // RESET PASSWORD
  // ==================================================

  function confirmResetPassword(admin) {
    setOpenMenu(null);

    setConfirmation({
      type: "reset-password",
      admin,
      title:
        "Reset Administrator Password?",
      message:
        `A new temporary password will be generated for ${getAdminName(
          admin
        )}.`,
    });
  }

  // ==================================================
  // EXECUTE ACTION
  // ==================================================

  async function executeConfirmation() {
    if (!confirmation?.admin) {
      return;
    }

    const {
      type,
      admin,
    } = confirmation;

    try {
      setActionLoading(true);

      let response;

      // --------------------------------------------
      // SUSPEND
      // --------------------------------------------

      if (type === "suspend") {
        response =
          await suspendSuperAdminAdmin(
            admin._id
          );
      }

      // --------------------------------------------
      // ACTIVATE
      // --------------------------------------------

      if (type === "activate") {
        response =
          await activateSuperAdminAdmin(
            admin._id
          );
      }

      // --------------------------------------------
      // RESET PASSWORD
      // --------------------------------------------

      if (
        type ===
        "reset-password"
      ) {
        response =
          await resetSuperAdminAdminPassword(
            admin._id
          );

        if (
          response?.temporaryPassword
        ) {
          setTemporaryPassword(
            response.temporaryPassword
          );
        }
      }

      // --------------------------------------------
      // DELETE
      // --------------------------------------------

      if (type === "delete") {
        response =
          await deleteSuperAdminAdmin(
            admin._id
          );
      }

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Action failed."
        );
      }

      // --------------------------------------------
      // RESET CONFIRMATION
      // --------------------------------------------

      setConfirmation(null);

      // --------------------------------------------
      // PASSWORD RESULT
      // --------------------------------------------

      if (
        type ===
        "reset-password"
      ) {
        setTemporaryPassword(
          response.temporaryPassword ||
            ""
        );
      } else {
        setMessage({
          type: "success",
          text:
            response.message ||
            "Action completed successfully.",
        });
      }

      // --------------------------------------------
      // REFRESH
      // --------------------------------------------

      await Promise.all([
        loadAdmins(),
        loadStatistics(),
      ]);

    } catch (error) {
      console.error(
        "Administrator action error:",
        error
      );

      setConfirmation(null);

      setMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to complete action.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  // ==================================================
  // ADMIN NAME
  // ==================================================

  function getAdminName(admin) {
    return (
      admin?.fullName ||
      admin?.name ||
      "Administrator"
    );
  }

  // ==================================================
  // FILTER
  // ==================================================

  const filteredAdmins =
    admins.filter((admin) => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return true;
      }

      return (
        admin.fullName
          ?.toLowerCase()
          .includes(query) ||
        admin.name
          ?.toLowerCase()
          .includes(query) ||
        admin.email
          ?.toLowerCase()
          .includes(query) ||
        admin.phone
          ?.toLowerCase()
          .includes(query)
      );
    });

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <DashboardLayout>

      <div
        className="superadmin-admins"
        onClick={() => {
          if (openMenu) {
            setOpenMenu(null);
          }
        }}
      >

        {/* ============================================
            HEADER
        ============================================ */}

        <section className="superadmin-page-header">

          <div>

            <span className="page-eyebrow">
              SUPER ADMINISTRATION
            </span>

            <h1>
              Administrators
            </h1>

            <p>
              Create and manage administrators
              who have access to the Benevolent
              Midax administration portal.
            </p>

          </div>

          <div className="page-header-actions">

            <button
              type="button"
              className="refresh-admin-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={refreshing}
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              className="add-admin-btn"
              onClick={(e) => {
                e.stopPropagation();
                openCreateModal();
              }}
            >
              <UserPlus size={18} />

              Add Administrator
            </button>

          </div>

        </section>

        {/* ============================================
            SUCCESS / ERROR MESSAGE
        ============================================ */}

        {message.text && (
          <div
            className={`superadmin-alert ${message.type}`}
          >
            {message.type ===
            "success" ? (
              <CheckCircle
                size={19}
              />
            ) : (
              <AlertCircle
                size={19}
              />
            )}

            <span>
              {message.text}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessage({
                  type: "",
                  text: "",
                })
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ============================================
            STATISTICS
        ============================================ */}

        <section className="admin-stat-grid">

          <div className="admin-stat-card">

            <div className="stat-icon">
              <ShieldCheck
                size={22}
              />
            </div>

            <div>
              <span>
                Total Administrators
              </span>

              <strong>
                {statistics.total ??
                  admins.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="stat-icon">
              <CheckCircle
                size={22}
              />
            </div>

            <div>
              <span>
                Active Administrators
              </span>

              <strong>
                {statistics.active ??
                  0}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="stat-icon">
              <UserX
                size={22}
              />
            </div>

            <div>
              <span>
                Suspended
              </span>

              <strong>
                {statistics.suspended ??
                  0}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="stat-icon">
              <Lock size={22} />
            </div>

            <div>
              <span>
                Security
              </span>

              <strong>
                Protected
              </strong>
            </div>

          </div>

        </section>

        {/* ============================================
            ADMIN SECTION
        ============================================ */}

        <section className="admins-section">

          <div className="admins-section-header">

            <div>
              <h2>
                Administrator Accounts
              </h2>

              <p>
                Users with administrator
                privileges.
              </p>
            </div>

            <div className="admin-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Search administrators..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* ==========================================
              LOADING
          ========================================== */}

          {loading && (
            <div className="admins-loading">

              <Loader2
                size={30}
                className="spin"
              />

              <p>
                Loading administrators...
              </p>

            </div>
          )}

          {/* ==========================================
              EMPTY
          ========================================== */}

          {!loading &&
            filteredAdmins.length ===
              0 && (

              <div className="admins-empty">

                <div className="empty-icon">
                  <ShieldCheck
                    size={32}
                  />
                </div>

                <h3>
                  {search
                    ? "No administrators found"
                    : "No administrators yet"}
                </h3>

                <p>
                  {search
                    ? "Try another search term."
                    : "Create your first administrator account to give someone access to the admin portal."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={
                      openCreateModal
                    }
                  >
                    <UserPlus
                      size={17}
                    />

                    Add Administrator
                  </button>
                )}

              </div>
            )}

          {/* ==========================================
              TABLE
          ========================================== */}

          {!loading &&
            filteredAdmins.length >
              0 && (

              <div className="admins-table-wrapper">

                <table className="admins-table">

                  <thead>

                    <tr>

                      <th>
                        Administrator
                      </th>

                      <th>
                        Contact
                      </th>

                      <th>
                        Role
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredAdmins.map(
                      (admin) => {

                        const adminName =
                          getAdminName(
                            admin
                          );

                        const status =
                          admin.status ||
                          "active";

                        return (
                          <tr
                            key={
                              admin._id
                            }
                          >

                            {/* USER */}

                            <td>

                              <div className="admin-user">

                                <div className="admin-avatar">

                                  {adminName
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </div>

                                <div>

                                  <strong>
                                    {
                                      adminName
                                    }
                                  </strong>

                                  <span>
                                    {
                                      admin.email
                                    }
                                  </span>

                                </div>

                              </div>

                            </td>

                            {/* CONTACT */}

                            <td>

                              <div className="contact-info">

                                <span>
                                  <Mail
                                    size={14}
                                  />

                                  {
                                    admin.email
                                  }
                                </span>

                                <span>
                                  <Phone
                                    size={14}
                                  />

                                  {
                                    admin.phone ||
                                    "No phone"
                                  }
                                </span>

                              </div>

                            </td>

                            {/* ROLE */}

                            <td>

                              <span className="role-badge">

                                <ShieldCheck
                                  size={14}
                                />

                                Administrator

                              </span>

                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`status-badge ${status}`}
                              >

                                <span />

                                {status
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase() +
                                  status.slice(
                                    1
                                  )}

                              </span>

                            </td>

                            {/* ACTIONS */}

                            <td>

                              <div className="admin-actions">

                                <button
                                  type="button"
                                  className="actions-trigger"
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation();

                                    setOpenMenu(
                                      openMenu ===
                                        admin._id
                                        ? null
                                        : admin._id
                                    );
                                  }}
                                  title="Administrator actions"
                                >
                                  <MoreVertical
                                    size={19}
                                  />
                                </button>

                                {openMenu ===
                                  admin._id && (

                                  <div
                                    className="admin-actions-menu"
                                    onClick={(
                                      e
                                    ) =>
                                      e.stopPropagation()
                                    }
                                  >

                                    {/* EDIT */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEditModal(
                                          admin
                                        )
                                      }
                                    >
                                      <Edit3
                                        size={16}
                                      />

                                      Edit
                                    </button>

                                    {/* RESET */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmResetPassword(
                                          admin
                                        )
                                      }
                                    >
                                      <KeyRound
                                        size={16}
                                      />

                                      Reset Password
                                    </button>

                                    {/* STATUS */}

                                    {status ===
                                    "active" ? (

                                      <button
                                        type="button"
                                        className="danger-action"
                                        onClick={() =>
                                          confirmSuspend(
                                            admin
                                          )
                                        }
                                      >
                                        <UserX
                                          size={16}
                                        />

                                        Suspend
                                      </button>

                                    ) : (

                                      <button
                                        type="button"
                                        className="success-action"
                                        onClick={() =>
                                          confirmActivate(
                                            admin
                                          )
                                        }
                                      >
                                        <UserCheck
                                          size={16}
                                        />

                                        Activate
                                      </button>

                                    )}

                                    <div className="menu-divider" />

                                    {/* DELETE */}

                                    <button
                                      type="button"
                                      className="danger-action"
                                      onClick={() =>
                                        confirmDelete(
                                          admin
                                        )
                                      }
                                    >
                                      <Trash2
                                        size={16}
                                      />

                                      Delete
                                    </button>

                                  </div>

                                )}

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

        </section>

      </div>

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      {showModal && (

        <div
          className="admin-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }

          }}
        >

          <div className="admin-modal">

            <div className="admin-modal-header">

              <div>

                <span>
                  SUPER ADMIN
                </span>

                <h2>
                  {editingAdmin
                    ? "Edit Administrator"
                    : "Add Administrator"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
              >
                <X size={21} />
              </button>

            </div>

            {message.text && (

              <div
                className={`admin-form-message ${message.type}`}
              >

                {message.type ===
                "success" ? (
                  <CheckCircle
                    size={18}
                  />
                ) : (
                  <AlertCircle
                    size={18}
                  />
                )}

                <span>
                  {message.text}
                </span>

              </div>

            )}

            <form
              className="admin-form"
              onSubmit={
                handleSubmit
              }
            >

              {/* NAME */}

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <div className="input-wrapper">

                  <UserPlus
                    size={18}
                  />

                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter full name"
                    value={
                      form.fullName
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="name"
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div className="form-group">

                <label>
                  Email Address
                </label>

                <div className="input-wrapper">

                  <Mail size={18} />

                  <input
                    type="email"
                    name="email"
                    placeholder="admin@example.com"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="email"
                  />

                </div>

              </div>

              {/* PHONE */}

              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <div className="input-wrapper">

                  <Phone size={18} />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="07XXXXXXXX"
                    value={
                      form.phone
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="tel"
                  />

                </div>

              </div>

              {/* STATUS - EDIT ONLY */}

              {editingAdmin && (

                <div className="form-group">

                  <label>
                    Account Status
                  </label>

                  <div className="input-wrapper">

                    <ShieldCheck
                      size={18}
                    />

                    <select
                      name="status"
                      value={
                        form.status
                      }
                      onChange={
                        handleChange
                      }
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>

                    </select>

                  </div>

                </div>

              )}

              {/* PASSWORD - CREATE ONLY */}

              {!editingAdmin && (

                <div className="form-group">

                  <label>
                    Temporary Password
                  </label>

                  <div className="input-wrapper">

                    <Lock size={18} />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      placeholder="Enter temporary password"
                      value={
                        form.password
                      }
                      onChange={
                        handleChange
                      }
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>

                  </div>

                  <small>
                    The administrator should
                    change this password after
                    their first login.
                  </small>

                </div>

              )}

              {/* ACTIONS */}

              <div className="admin-form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-admin-btn"
                  disabled={
                    submitting
                  }
                >

                  {submitting ? (

                    <>
                      <Loader2
                        size={18}
                        className="spin"
                      />

                      Saving...
                    </>

                  ) : (

                    <>
                      {editingAdmin ? (
                        <Edit3
                          size={18}
                        />
                      ) : (
                        <UserPlus
                          size={18}
                        />
                      )}

                      {editingAdmin
                        ? "Save Changes"
                        : "Create Administrator"}

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          CONFIRMATION MODAL
      ================================================= */}

      {confirmation && (

        <div className="admin-modal-overlay">

          <div className="admin-confirm-modal">

            <div className="confirm-icon">

              {confirmation.type ===
              "delete" ? (
                <Trash2 size={26} />
              ) : confirmation.type ===
                "reset-password" ? (
                <KeyRound
                  size={26}
                />
              ) : confirmation.type ===
                "suspend" ? (
                <UserX size={26} />
              ) : (
                <UserCheck
                  size={26}
                />
              )}

            </div>

            <h2>
              {confirmation.title}
            </h2>

            <p>
              {confirmation.message}
            </p>

            <div className="confirm-actions">

              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  setConfirmation(
                    null
                  )
                }
                disabled={
                  actionLoading
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmation.type ===
                  "delete"
                    ? "confirm-danger-btn"
                    : "confirm-action-btn"
                }
                onClick={
                  executeConfirmation
                }
                disabled={
                  actionLoading
                }
              >

                {actionLoading ? (

                  <>
                    <Loader2
                      size={17}
                      className="spin"
                    />

                    Processing...
                  </>

                ) : (

                  "Confirm"

                )}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          TEMPORARY PASSWORD MODAL
      ================================================= */}

      {temporaryPassword && (

        <div className="admin-modal-overlay">

          <div className="admin-confirm-modal password-result">

            <div className="confirm-icon">

              <KeyRound
                size={26}
              />

            </div>

            <h2>
              Temporary Password
            </h2>

            <p>
              Give this password to the
              administrator securely. They
              should change it after logging in.
            </p>

            <div className="temporary-password">

              {temporaryPassword}

            </div>

            <button
              type="button"
              className="submit-admin-btn"
              onClick={() =>
                setTemporaryPassword(
                  ""
                )
              }
            >
              <CheckCircle
                size={18}
              />

              Done
            </button>

          </div>

        </div>

      )}

    </DashboardLayout>
  );
}

export default SuperAdminAdmins;
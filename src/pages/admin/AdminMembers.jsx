import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { resolveApiUrl } from "../../services/api";

import {
  getAdminMembers,
  createAdminMember,
  updateAdminMember,
  deleteAdminMember,
  suspendAdminMember,
  activateAdminMember,
  resetAdminMemberPassword,
} from "../../services/adminService";

import "./AdminMembers.css";

function AdminMembers() {
  // ========================================
  // DATA
  // ========================================

  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ========================================
  // SEARCH
  // ========================================

  const [search, setSearch] = useState("");

  const [searchInput, setSearchInput] = useState("");

  // ========================================
  // PAGINATION
  // ========================================

  const [page, setPage] = useState(1);

  const limit = 10;

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  // ========================================
  // MODALS
  // ========================================

  const [selectedMember, setSelectedMember] =
    useState(null);

  const [showMemberForm, setShowMemberForm] =
    useState(false);

  const [editingMember, setEditingMember] =
    useState(null);

  const [credentialResult, setCredentialResult] =
    useState(null);

  // ========================================
  // ACTION STATES
  // ========================================

  const [deletingId, setDeletingId] =
    useState(null);

  const [statusId, setStatusId] =
    useState(null);

  const [resettingId, setResettingId] =
    useState(null);

  // ========================================
  // LOAD MEMBERS
  // ========================================

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminMembers({
        page,
        limit,
        search,
      });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to load members."
        );
      }

      setMembers(
        Array.isArray(response.members)
          ? response.members
          : []
      );

      setTotal(Number(response.total) || 0);

      setTotalPages(
        Number(response.totalPages) || 1
      );
    } catch (err) {
      console.error(
        "Admin members error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load members."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [page, search]);

  // ========================================
  // SEARCH
  // ========================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // ========================================
  // ADD MEMBER
  // ========================================

  const handleAddMember = () => {
    setEditingMember(null);
    setError("");
    setCredentialResult(null);
    setShowMemberForm(true);
  };

  // ========================================
  // EDIT MEMBER
  // ========================================

  const handleEditMember = (member) => {
    setEditingMember(member);
    setError("");
    setCredentialResult(null);
    setShowMemberForm(true);
  };

  // ========================================
  // SAVE MEMBER
  // ========================================

  const handleSaveMember = async (formData) => {
    try {
      setError("");

      let response;

      if (editingMember) {
        const memberId =
          editingMember._id ||
          editingMember.id;

        response = await updateAdminMember(
          memberId,
          formData
        );
      } else {
        response =
          await createAdminMember(
            formData
          );
      }

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to save member."
        );
      }

      setShowMemberForm(false);
      setEditingMember(null);

      if (!editingMember) {
        setCredentialResult({
          fullName:
            formData.fullName,
          memberNumber:
            formData.memberNumber,
          username:
            formData.username,
          temporaryPassword:
            response.temporaryPassword ||
            "MIDAX@123",
        });
      }

      await loadMembers();
    } catch (err) {
      console.error(
        "Save member error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save member."
      );
    }
  };

  // ========================================
  // DELETE MEMBER
  // ========================================

  const handleDelete = async (member) => {
    const memberId =
      member._id || member.id;

    if (!memberId) return;

    const confirmed =
      window.confirm(
        `Are you sure you want to remove ${
          member.fullName ||
          "this member"
        }?`
      );

    if (!confirmed) return;

    try {
      setDeletingId(memberId);
      setError("");

      const response =
        await deleteAdminMember(
          memberId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to remove member."
        );
      }

      if (
        selectedMember?._id ===
          memberId ||
        selectedMember?.id ===
          memberId
      ) {
        setSelectedMember(null);
      }

      await loadMembers();
    } catch (err) {
      console.error(
        "Delete member error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to remove member."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ========================================
  // STATUS CHANGE
  // ========================================

  const handleStatusChange = async (
    member
  ) => {
    const memberId =
      member._id || member.id;

    if (!memberId) return;

    const isSuspended =
      String(
        member.status || ""
      ).toLowerCase() ===
      "suspended";

    const isInactive =
      String(
        member.status || ""
      ).toLowerCase() ===
      "inactive";

    const action =
      isSuspended || isInactive
        ? "activate"
        : "suspend";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} ${
          member.fullName ||
          "this member"
        }?`
      );

    if (!confirmed) return;

    try {
      setStatusId(memberId);
      setError("");

      const response =
        action === "suspend"
          ? await suspendAdminMember(
              memberId
            )
          : await activateAdminMember(
              memberId
            );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            `Unable to ${action} member.`
        );
      }

      await loadMembers();
    } catch (err) {
      console.error(
        "Member status error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to change member status."
      );
    } finally {
      setStatusId(null);
    }
  };

  // ========================================
  // RESET PASSWORD
  // ========================================

  const handleResetPassword = async (
    member
  ) => {
    const memberId =
      member._id || member.id;

    if (!memberId) return;

    const confirmed =
      window.confirm(
        `Reset the password for ${
          member.fullName ||
          "this member"
        }?`
      );

    if (!confirmed) return;

    try {
      setResettingId(memberId);
      setError("");

      const response =
        await resetAdminMemberPassword(
          memberId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to reset password."
        );
      }

      setCredentialResult({
        fullName:
          member.fullName,
        memberNumber:
          member.memberNumber,
        username:
          member.username,
        temporaryPassword:
          response.temporaryPassword ||
          "MIDAX@123",
        reset: true,
      });
    } catch (err) {
      console.error(
        "Reset password error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to reset password."
      );
    } finally {
      setResettingId(null);
    }
  };

  // ========================================
  // SUMMARY
  // ========================================

  const activeMembers =
    members.filter(
      (member) =>
        String(
          member.status
        ).toLowerCase() ===
        "active"
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        String(
          member.status
        ).toLowerCase() ===
        "inactive"
    ).length;

  const suspendedMembers =
    members.filter(
      (member) =>
        String(
          member.status
        ).toLowerCase() ===
        "suspended"
    ).length;

  const displayedMembers =
    useMemo(
      () => members,
      [members]
    );

  // ========================================
  // RENDER
  // ========================================

  return (
    <DashboardLayout>

      <div className="admin-members-page">

        {/* ==================================
            HEADER
        ================================== */}

        <section className="admin-page-header">

          <div>
            <span>
              ADMINISTRATION
            </span>

            <h1>
              Members
            </h1>

            <p>
              Create and manage
              Benevolent Midax member
              accounts.
            </p>
          </div>

          <div className="admin-header-actions">

            <button
              type="button"
              className="admin-refresh-button"
              onClick={loadMembers}
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

            <button
              type="button"
              className="admin-add-member-button"
              onClick={
                handleAddMember
              }
            >
              + Add Member
            </button>

          </div>

        </section>

        {/* ==================================
            ERROR
        ================================== */}

        {error && (
          <div className="admin-members-alert">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* ==================================
            STATISTICS
        ================================== */}

        <section className="admin-member-stats">

          <StatCard
            label="Members Found"
            value={total}
          />

          <StatCard
            label="Active"
            value={activeMembers}
          />

          <StatCard
            label="Inactive"
            value={inactiveMembers}
          />

          <StatCard
            label="Suspended"
            value={suspendedMembers}
          />

        </section>

        {/* ==================================
            SEARCH
        ================================== */}

        <section className="admin-member-controls">

          <form
            className="admin-member-search"
            onSubmit={
              handleSearch
            }
          >

            <span>
              🔎
            </span>

            <input
              type="search"
              placeholder="Search by name, member number, email or phone..."
              value={
                searchInput
              }
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
            />

            <button type="submit">
              Search
            </button>

          </form>

        </section>

        {/* ==================================
            MEMBER TABLE
        ================================== */}

        <section className="admin-members-card">

          <div className="admin-members-card-header">

            <div>
              <span>
                MEMBER DIRECTORY
              </span>

              <h2>
                All Members
              </h2>
            </div>

            <strong>
              {total}
            </strong>

          </div>

          {loading ? (

            <LoadingState />

          ) : displayedMembers.length ===
            0 ? (

            <EmptyState
              search={search}
            />

          ) : (

            <div className="admin-members-table-wrapper">

              <table className="admin-members-table">

                <thead>
                  <tr>

                    <th>
                      Member
                    </th>

                    <th>
                      Member Number
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Department
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

                  {displayedMembers.map(
                    (member) => {

                      const memberId =
                        member._id ||
                        member.id;

                      const status =
                        String(
                          member.status ||
                            "active"
                        ).toLowerCase();

                      const deleting =
                        deletingId ===
                        memberId;

                      const changingStatus =
                        statusId ===
                        memberId;

                      const resetting =
                        resettingId ===
                        memberId;

                      return (
                        <tr
                          key={memberId}
                        >

                          {/* MEMBER */}

                          <td>

                            <div className="admin-member-identity">

                              <div className="admin-member-avatar">
                                {getInitials(
                                  member.fullName
                                )}
                              </div>

                              <div>

                                <strong>
                                  {member.fullName ||
                                    "Unnamed Member"}
                                </strong>

                                <span>
                                  {member.email ||
                                    "No email"}
                                </span>

                              </div>

                            </div>

                          </td>

                          {/* NUMBER */}

                          <td>

                            <span className="member-number">
                              {member.memberNumber ||
                                "—"}
                            </span>

                          </td>

                          {/* CONTACT */}

                          <td>

                            <div className="member-contact">

                              <span>
                                {member.phone ||
                                  "No phone"}
                              </span>

                              <span>
                                {member.email ||
                                  "No email"}
                              </span>

                            </div>

                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            {member.department ||
                              "—"}
                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`admin-member-status ${status}`}
                            >
                              {capitalize(
                                status
                              )}
                            </span>

                          </td>

                          {/* ACTIONS */}

                          <td>

                            <div className="admin-member-actions">

                              <button
                                type="button"
                                className="view-member-button"
                                onClick={() =>
                                  setSelectedMember(
                                    member
                                  )
                                }
                              >
                                View
                              </button>

                              <button
                                type="button"
                                className="edit-member-button"
                                onClick={() =>
                                  handleEditMember(
                                    member
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className={`status-member-button ${status}`}
                                disabled={
                                  changingStatus
                                }
                                onClick={() =>
                                  handleStatusChange(
                                    member
                                  )
                                }
                              >
                                {changingStatus
                                  ? "..."
                                  : status ===
                                      "suspended" ||
                                    status ===
                                      "inactive"
                                  ? "Activate"
                                  : "Suspend"}
                              </button>

                              <button
                                type="button"
                                className="reset-member-button"
                                disabled={
                                  resetting
                                }
                                onClick={() =>
                                  handleResetPassword(
                                    member
                                  )
                                }
                              >
                                {resetting
                                  ? "..."
                                  : "Reset"}
                              </button>

                              <button
                                type="button"
                                className="delete-member-button"
                                disabled={
                                  deleting
                                }
                                onClick={() =>
                                  handleDelete(
                                    member
                                  )
                                }
                              >
                                {deleting
                                  ? "..."
                                  : "Remove"}
                              </button>

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

          {/* =================================
              PAGINATION
          ================================= */}

          {!loading &&
            totalPages > 1 && (

              <div className="admin-members-pagination">

                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current - 1
                    )
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                >
                  Next
                </button>

              </div>

            )}

        </section>

        {/* ==================================
            MEMBER DETAILS
        ================================== */}

        {selectedMember && (

          <MemberDetailsModal
            member={
              selectedMember
            }
            onClose={() =>
              setSelectedMember(
                null
              )
            }
            onEdit={() => {
              setSelectedMember(
                null
              );

              handleEditMember(
                selectedMember
              );
            }}
          />

        )}

        {/* ==================================
            CREATE / EDIT MEMBER
        ================================== */}

        {showMemberForm && (

          <MemberFormModal
            member={
              editingMember
            }
            onClose={() => {
              setShowMemberForm(
                false
              );

              setEditingMember(
                null
              );
            }}
            onSave={
              handleSaveMember
            }
          />

        )}

        {/* ==================================
            CREDENTIALS
        ================================== */}

        {credentialResult && (

          <CredentialsModal
            result={
              credentialResult
            }
            onClose={() =>
              setCredentialResult(
                null
              )
            }
          />

        )}

      </div>

    </DashboardLayout>
  );
}


// ========================================
// STAT CARD
// ========================================

function StatCard({
  label,
  value,
}) {
  return (
    <div className="admin-member-stat-card">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// ========================================
// LOADING
// ========================================

function LoadingState() {
  return (
    <div className="admin-members-loading">

      <div className="admin-spinner" />

      <p>
        Loading members...
      </p>

    </div>
  );
}


// ========================================
// EMPTY
// ========================================

function EmptyState({
  search,
}) {
  return (
    <div className="admin-members-empty">

      <div>
        👥
      </div>

      <h3>
        No members found
      </h3>

      <p>
        {search
          ? "Try a different search."
          : "There are currently no members."}
      </p>

    </div>
  );
}


// ========================================
// MEMBER FORM
// ========================================

function MemberFormModal({
  member,
  onClose,
  onSave,
}) {
  const editing = Boolean(member);

  const [form, setForm] = useState({
    memberNumber:
      member?.memberNumber || "",
    fullName:
      member?.fullName || "",
    username:
      member?.username || "",
    phone:
      member?.phone || "",
    email:
      member?.email || "",
    department:
      member?.department || "",
    position:
      member?.position || "",
    monthlyContribution:
      member?.monthlyContribution ??
      "",
  });

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.memberNumber.trim() ||
      !form.fullName.trim() ||
      !form.phone.trim()
    ) {
      setFormError(
        "Member Number, Full Name and Phone are required."
      );

      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await onSave({
        ...form,
        monthlyContribution:
          Number(
            form.monthlyContribution
          ) || 0,
      });
    } catch (error) {
      setFormError(
        error.message ||
          "Unable to save member."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-member-modal-overlay"
      onClick={onClose}
    >

      <div
        className="admin-member-form-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="admin-member-modal-header">

          <div>

            <span>
              {editing
                ? "EDIT MEMBER"
                : "CREATE MEMBER ACCOUNT"}
            </span>

            <h2>
              {editing
                ? "Edit Member"
                : "Add New Member"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {!editing && (
          <div className="admin-member-form-info">
            <strong>
              Account creation
            </strong>

            <p>
              The member will receive a
              temporary password after
              the account is created.
            </p>
          </div>
        )}

        {formError && (
          <div className="admin-form-error">
            {formError}
          </div>
        )}

        <form
          className="admin-member-form"
          onSubmit={
            handleSubmit
          }
        >

          <div className="admin-form-grid">

            <FormField
              label="Member Number *"
              name="memberNumber"
              value={
                form.memberNumber
              }
              onChange={
                handleChange
              }
              placeholder="e.g. BM001"
            />

            <FormField
              label="Full Name *"
              name="fullName"
              value={
                form.fullName
              }
              onChange={
                handleChange
              }
              placeholder="Full member name"
            />

            <FormField
              label="Username"
              name="username"
              value={
                form.username
              }
              onChange={
                handleChange
              }
              placeholder="Member username"
            />

            <FormField
              label="Phone *"
              name="phone"
              value={
                form.phone
              }
              onChange={
                handleChange
              }
              placeholder="07XXXXXXXX"
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              value={
                form.email
              }
              onChange={
                handleChange
              }
              placeholder="member@example.com"
            />

            <FormField
              label="Department"
              name="department"
              value={
                form.department
              }
              onChange={
                handleChange
              }
              placeholder="Department"
            />

            <FormField
              label="Position"
              name="position"
              value={
                form.position
              }
              onChange={
                handleChange
              }
              placeholder="Position"
            />

            <FormField
              label="Monthly Contribution"
              name="monthlyContribution"
              type="number"
              min="0"
              value={
                form.monthlyContribution
              }
              onChange={
                handleChange
              }
              placeholder="0"
            />

          </div>

          <div className="admin-member-form-actions">

            <button
              type="button"
              className="admin-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-save-member-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                ? "Save Changes"
                : "Create Member"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


// ========================================
// FORM FIELD
// ========================================

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
}) {
  return (
    <label className="admin-form-field">

      <span>
        {label}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
      />

    </label>
  );
}


// ========================================
// MEMBER DETAILS MODAL
// ========================================

function MemberDetailsModal({
  member,
  onClose,
  onEdit,
}) {
  const safeDocs = member?.documents || {};
  const profileImage = resolveUploadUrl(member?.profileImage || safeDocs?.profilePhoto || "");
  const coverImage = resolveUploadUrl(member?.coverImage || safeDocs?.coverImage || "");
  const passportPhoto = resolveUploadUrl(member?.passportPhoto || safeDocs?.passportPhoto || "");
  const nationalFront = resolveUploadUrl(safeDocs?.nationalIdFront || "");
  const nationalBack = resolveUploadUrl(safeDocs?.nationalIdBack || "");
  const signature = resolveUploadUrl(safeDocs?.signature || "");

  const documentLinks = [
    { label: "Profile Photo", src: member?.profileImage || safeDocs?.profilePhoto },
    { label: "Cover Image", src: member?.coverImage || safeDocs?.coverImage },
    { label: "Passport Photo", src: member?.passportPhoto || safeDocs?.passportPhoto },
    { label: "National ID Front", src: safeDocs?.nationalIdFront },
    { label: "National ID Back", src: safeDocs?.nationalIdBack },
    { label: "Signature", src: safeDocs?.signature },
  ].filter((item) => String(item.src || "").trim());

  return (
    <div
      className="admin-member-modal-overlay"
      onClick={onClose}
    >

      <div
        className="admin-member-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="admin-member-modal-header">

          <div>

            <span>
              MEMBER PROFILE
            </span>

            <h2>
              {member.fullName ||
                "Member"}
            </h2>

            <p className="admin-member-modal-subtitle">
              Full record, profile details and uploads visible for secure review.
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <div className="admin-member-modal-actions">

          <button
            type="button"
            className="edit-member-button"
            onClick={onEdit}
          >
            Edit Member
          </button>

        </div>

        <div className="admin-member-hero">
          <div className="admin-member-hero-avatar">
            <img src={profileImage || "/default-avatar.svg"} alt={member.fullName || "Member"} />
          </div>
          <div className="admin-member-hero-copy">
            <strong>{member.memberNumber || "—"}</strong>
            <span>{member.department || "No department"}</span>
            <p>{member.bio || "No bio provided."}</p>
          </div>
        </div>

        <div className="admin-member-modal-body admin-member-modal-body-grid">

          <MemberDetail label="Full Name" value={member.fullName} />
          <MemberDetail label="Username" value={member.username} />
          <MemberDetail label="Email" value={member.email} />
          <MemberDetail label="Phone" value={member.phone} />
          <MemberDetail label="Department" value={member.department} />
          <MemberDetail label="Position" value={member.position} />
          <MemberDetail label="Monthly Contribution" value={member.monthlyContribution !== undefined ? `KES ${Number(member.monthlyContribution).toLocaleString()}` : "—"} />
          <MemberDetail label="Role" value={member.role} />
          <MemberDetail label="Status" value={capitalize(member.status || "active")} />
          <MemberDetail label="Verified" value={member.verified ? "Yes" : "No"} />
          <MemberDetail label="Online" value={member.online ? "Online" : "Offline"} />
          <MemberDetail label="Join Date" value={formatDate(member.joinDate)} />
          <MemberDetail label="National ID" value={member.nationalId} />
          <MemberDetail label="Gender" value={member.gender} />
          <MemberDetail label="Date of Birth" value={formatDate(member.dateOfBirth)} />
          <MemberDetail label="Marital Status" value={member.maritalStatus} />
          <MemberDetail label="County" value={member.county} />
          <MemberDetail label="Sub-County" value={member.subCounty} />
          <MemberDetail label="Ward" value={member.ward} />
          <MemberDetail label="Village" value={member.village} />
          <MemberDetail label="Postal Address" value={member.postalAddress} />
          <MemberDetail label="Physical Address" value={member.physicalAddress} />
          <MemberDetail label="Occupation" value={member.occupation} />
          <MemberDetail label="Employer" value={member.employer} />
          <MemberDetail label="Monthly Income" value={member.monthlyIncome !== undefined ? `KES ${Number(member.monthlyIncome || 0).toLocaleString()}` : "—"} />
          <MemberDetail label="M-Pesa Number" value={member.mpesaNumber} />
          <MemberDetail label="Bank Name" value={member.bankName} />
          <MemberDetail label="Bank Branch" value={member.bankBranch} />
          <MemberDetail label="Account Number" value={member.accountNumber} />
          <MemberDetail label="Next of Kin" value={member.nextOfKin?.fullName} />
          <MemberDetail label="Kin Relationship" value={member.nextOfKin?.relationship} />
          <MemberDetail label="Kin Phone" value={member.nextOfKin?.phone} />
          <MemberDetail label="Kin ID" value={member.nextOfKin?.nationalId} />
          <MemberDetail label="Emergency Contact" value={member.emergencyContact?.fullName} />
          <MemberDetail label="Emergency Relationship" value={member.emergencyContact?.relationship} />
          <MemberDetail label="Emergency Phone" value={member.emergencyContact?.phone} />
          <MemberDetail label="Profile Completion" value={`${Number(member.profileCompletion || 0)}%`} />
          <MemberDetail label="Profile Completed" value={member.profileCompleted ? "Yes" : "No"} />
          <MemberDetail label="Profile Verified" value={member.profileVerified ? "Yes" : "No"} />
          <MemberDetail label="Last Login" value={formatDate(member.lastLogin)} />
          <MemberDetail label="Last Seen" value={formatDate(member.lastSeen)} />
          <MemberDetail label="Constitution Accepted" value={member.acceptedConstitution ? "Yes" : "No"} />
          <MemberDetail label="Privacy Accepted" value={member.acceptedPrivacyPolicy ? "Yes" : "No"} />
          <MemberDetail label="Declaration Accepted" value={member.acceptedDeclaration ? "Yes" : "No"} />
          <MemberDetail label="Passport Photo" value={passportPhoto ? "Uploaded" : "—"} />
          <MemberDetail label="National ID Front" value={nationalFront ? "Uploaded" : "—"} />
          <MemberDetail label="National ID Back" value={nationalBack ? "Uploaded" : "—"} />
          <MemberDetail label="Signature" value={signature ? "Uploaded" : "—"} />

        </div>

        <div className="admin-member-uploads">
          {profileImage && (
            <UploadPreview label="Profile Photo" src={profileImage} />
          )}
          {coverImage && (
            <UploadPreview label="Cover Image" src={coverImage} />
          )}
          {passportPhoto && (
            <UploadPreview label="Passport Photo" src={passportPhoto} />
          )}
          {nationalFront && (
            <UploadPreview label="ID Front" src={nationalFront} />
          )}
          {nationalBack && (
            <UploadPreview label="ID Back" src={nationalBack} />
          )}
          {signature && (
            <UploadPreview label="Signature" src={signature} />
          )}
        </div>

        {documentLinks.length > 0 && (
          <div className="admin-member-file-list">
            {documentLinks.map((file) => (
              <a
                key={file.label}
                className="admin-member-file-link"
                href={resolveUploadUrl(file.src)}
                target="_blank"
                rel="noreferrer"
              >
                <strong>{file.label}</strong>
                <span>Open uploaded file</span>
              </a>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}



function UploadPreview({ label, src }) {
  return (
    <div className="admin-upload-preview">
      <span>{label}</span>
      <a href={src} target="_blank" rel="noreferrer">
        <img src={resolveUploadUrl(src)} alt={label} />
      </a>
    </div>
  );
}

// ========================================
// CREDENTIALS MODAL
// ========================================

function CredentialsModal({
  result,
  onClose,
}) {
  const handleCopy = async () => {
    const text = `
Benevolent Midax Member Account

Name: ${result.fullName || "—"}
Member Number: ${
      result.memberNumber || "—"
    }
Username: ${
      result.username || "—"
    }
Temporary Password: ${
      result.temporaryPassword
    }
    `.trim();

    try {
      await navigator.clipboard.writeText(
        text
      );

      window.alert(
        "Credentials copied."
      );
    } catch {
      window.alert(
        "Unable to copy credentials."
      );
    }
  };

  return (
    <div
      className="admin-member-modal-overlay"
      onClick={onClose}
    >

      <div
        className="admin-credentials-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="credentials-icon">
          ✓
        </div>

        <span className="credentials-label">
          {result.reset
            ? "PASSWORD RESET"
            : "ACCOUNT CREATED"}
        </span>

        <h2>
          {result.reset
            ? "Password Reset Successfully"
            : "Member Account Created"}
        </h2>

        <p>
          Give these credentials to the
          member. They should change the
          temporary password after logging
          in.
        </p>

        <div className="credentials-box">

          <CredentialRow
            label="Name"
            value={
              result.fullName
            }
          />

          <CredentialRow
            label="Member Number"
            value={
              result.memberNumber
            }
          />

          <CredentialRow
            label="Username"
            value={
              result.username
            }
          />

          <CredentialRow
            label="Temporary Password"
            value={
              result.temporaryPassword
            }
            password
          />

        </div>

        <div className="credentials-actions">

          <button
            type="button"
            className="copy-credentials-button"
            onClick={
              handleCopy
            }
          >
            Copy Credentials
          </button>

          <button
            type="button"
            className="admin-cancel-button"
            onClick={onClose}
          >
            Done
          </button>

        </div>

      </div>

    </div>
  );
}


// ========================================
// CREDENTIAL ROW
// ========================================

function CredentialRow({
  label,
  value,
  password,
}) {
  return (
    <div className="credential-row">

      <span>
        {label}
      </span>

      <strong
        className={
          password
            ? "temporary-password"
            : ""
        }
      >
        {value || "—"}
      </strong>

    </div>
  );
}


// ========================================
// MEMBER DETAIL
// ========================================

function MemberDetail({
  label,
  value,
}) {
  return (
    <div className="admin-member-detail">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}


// ========================================
// HELPERS
// ========================================

function resolveUploadUrl(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return resolveApiUrl(src);
}

function getInitials(name) {
  if (!name) {
    return "M";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word[0]?.toUpperCase()
    )
    .join("");
}


function capitalize(value) {
  const text = String(value);

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


export default AdminMembers;

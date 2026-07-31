
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  Users,
  UserCheck,
  UserX,
  Ban,
  Eye,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAdminMembers,
  deleteAdminMember,
} from "../../services/adminService";

import "./AdminMembers.css";

// ========================================
// ADMIN MEMBERS
// ========================================

function AdminMembers() {
  // ======================================
  // MEMBERS
  // ======================================

  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  // ======================================
  // SEARCH
  // ======================================

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  // ======================================
  // PAGINATION
  // ======================================

  const [page, setPage] = useState(1);

  const limit = 10;

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  // ======================================
  // SELECTED MEMBER
  // ======================================

  const [selectedMember, setSelectedMember] =
    useState(null);

  // ======================================
  // DELETE
  // ======================================

  const [deletingId, setDeletingId] =
    useState(null);

  // ======================================
  // LOAD MEMBERS
  // ======================================

  const loadMembers = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await getAdminMembers({
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

        const loadedMembers =
          Array.isArray(response.members)
            ? response.members
            : [];

        setMembers(loadedMembers);

        setTotal(
          Number(response.total) || 0
        );

        setTotalPages(
          Math.max(
            Number(response.totalPages) || 1,
            1
          )
        );
      } catch (err) {
        console.error(
          "Admin members error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load members."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search]
  );

  // ======================================
  // INITIAL / SEARCH / PAGE LOAD
  // ======================================

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ======================================
  // SEARCH
  // ======================================

  const handleSearch = (event) => {
    event.preventDefault();

    const newSearch =
      searchInput.trim();

    if (page !== 1) {
      setPage(1);
    }

    setSearch(newSearch);
  };

  // ======================================
  // CLEAR SEARCH
  // ======================================

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // ======================================
  // DELETE MEMBER
  // ======================================

  const handleDelete = async (member) => {
    const memberId =
      member?._id || member?.id;

    if (!memberId) {
      setError(
        "This member does not have a valid ID."
      );
      return;
    }

    const memberName =
      member?.fullName ||
      member?.username ||
      "this member";

    const confirmed =
      window.confirm(
        `Are you sure you want to remove ${memberName}?`
      );

    if (!confirmed) {
      return;
    }

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
            "Unable to delete member."
        );
      }

      // Close modal if deleted member
      // was currently selected.
      if (
        selectedMember?._id === memberId ||
        selectedMember?.id === memberId
      ) {
        setSelectedMember(null);
      }

      // If the last member on a page
      // was deleted, move back one page.
      if (
        members.length === 1 &&
        page > 1
      ) {
        setPage(
          (currentPage) =>
            currentPage - 1
        );
      } else {
        await loadMembers();
      }
    } catch (err) {
      console.error(
        "Delete member error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to delete member."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ======================================
  // SUMMARY
  // ======================================

  const activeMembers =
    members.filter(
      (member) =>
        String(
          member?.status || ""
        ).toLowerCase() === "active"
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        String(
          member?.status || ""
        ).toLowerCase() === "inactive"
    ).length;

  const suspendedMembers =
    members.filter(
      (member) =>
        String(
          member?.status || ""
        ).toLowerCase() === "suspended"
    ).length;

  // ======================================
  // RENDER
  // ======================================

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
              Manage Benevolent Midax
              member accounts.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={() =>
              loadMembers(true)
            }
            disabled={
              loading || refreshing
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spinning"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

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
              aria-label="Close error"
            >
              <X size={17} />
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
            icon={Users}
          />

          <StatCard
            label="Active"
            value={activeMembers}
            icon={UserCheck}
          />

          <StatCard
            label="Inactive"
            value={inactiveMembers}
            icon={UserX}
          />

          <StatCard
            label="Suspended"
            value={suspendedMembers}
            icon={Ban}
          />

        </section>

        {/* ==================================
            SEARCH
        ================================== */}

        <section className="admin-member-controls">

          <form
            className="admin-member-search"
            onSubmit={handleSearch}
          >
            <Search
              size={17}
              aria-hidden="true"
            />

            <input
              type="search"
              placeholder="Search by name, member number, email or phone..."
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
            />

            {searchInput && (
              <button
                type="button"
                onClick={
                  handleClearSearch
                }
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
            >
              Search
            </button>

          </form>

        </section>

        {/* ==================================
            MEMBERS CARD
        ================================== */}

        <section className="admin-members-card">

          {/* HEADER */}

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

          {/* ==================================
              CONTENT
          ================================== */}

          {loading ? (
            <LoadingState />
          ) : members.length === 0 ? (
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

                  {members.map(
                    (member) => {
                      const memberId =
                        member?._id ||
                        member?.id;

                      const status =
                        String(
                          member?.status ||
                            "active"
                        ).toLowerCase();

                      const deleting =
                        deletingId ===
                        memberId;

                      return (
                        <tr
                          key={
                            memberId ||
                            `${member.memberNumber}-${member.email}`
                          }
                        >

                          {/* MEMBER */}

                          <td>
                            <div className="admin-member-identity">

                              <div className="admin-member-avatar">

                                {member?.profileImage ? (
                                  <img
                                    src={
                                      member.profileImage
                                    }
                                    alt={
                                      member.fullName ||
                                      "Member"
                                    }
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        "100%",
                                      borderRadius:
                                        "50%",
                                      objectFit:
                                        "cover",
                                    }}
                                  />
                                ) : (
                                  getInitials(
                                    member?.fullName
                                  )
                                )}

                              </div>

                              <div>

                                <strong>
                                  {member?.fullName ||
                                    member?.username ||
                                    "Unnamed Member"}
                                </strong>

                                <span>
                                  {member?.email ||
                                    "No email"}
                                </span>

                              </div>

                            </div>
                          </td>

                          {/* MEMBER NUMBER */}

                          <td>
                            <span className="member-number">
                              {member?.memberNumber ||
                                "—"}
                            </span>
                          </td>

                          {/* CONTACT */}

                          <td>
                            <div className="member-contact">

                              <span>
                                {member?.phone ||
                                  "No phone"}
                              </span>

                              <span>
                                {member?.email ||
                                  "No email"}
                              </span>

                            </div>
                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            {member?.department ||
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
                                title="View member"
                              >
                                <Eye
                                  size={14}
                                />

                                View
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
                                title="Remove member"
                              >
                                <Trash2
                                  size={14}
                                />

                                {deleting
                                  ? "Removing..."
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

          {/* ==================================
              PAGINATION
          ================================== */}

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
                        Math.max(
                          current - 1,
                          1
                        )
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
                        Math.min(
                          current + 1,
                          totalPages
                        )
                    )
                  }
                >
                  Next
                </button>

              </div>
            )}

        </section>

        {/* ==================================
            MEMBER DETAILS MODAL
        ================================== */}

        {selectedMember && (
          <MemberDetailsModal
            member={selectedMember}
            onClose={() =>
              setSelectedMember(null)
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
  icon: Icon,
}) {
  return (
    <div className="admin-member-stat-card">

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {Icon && (
          <Icon
            size={16}
            style={{
              color: "#ff7a00",
            }}
          />
        )}

        <span>
          {label}
        </span>
      </div>

      <strong>
        {Number(value || 0).toLocaleString()}
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
// MEMBER DETAILS MODAL
// ========================================

function MemberDetailsModal({
  member,
  onClose,
}) {
  const status =
    String(
      member?.status || "active"
    ).toLowerCase();

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

        {/* HEADER */}

        <div className="admin-member-modal-header">

          <div>

            <span>
              MEMBER PROFILE
            </span>

            <h2>
              {member?.fullName ||
                member?.username ||
                "Member"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close member profile"
          >
            <X size={19} />
          </button>

        </div>

        {/* BODY */}

        <div className="admin-member-modal-body">

          <MemberDetail
            label="Member Number"
            value={
              member?.memberNumber
            }
          />

          <MemberDetail
            label="Username"
            value={
              member?.username
            }
          />

          <MemberDetail
            label="Email"
            value={
              member?.email
            }
          />

          <MemberDetail
            label="Phone"
            value={
              member?.phone
            }
          />

          <MemberDetail
            label="Department"
            value={
              member?.department
            }
          />

          <MemberDetail
            label="Position"
            value={
              member?.position
            }
          />

          <MemberDetail
            label="Monthly Contribution"
            value={
              member?.monthlyContribution !==
                undefined &&
              member?.monthlyContribution !==
                null
                ? `KES ${Number(
                    member.monthlyContribution
                  ).toLocaleString()}`
                : "—"
            }
          />

          <MemberDetail
            label="Status"
            value={capitalize(status)}
          />

          <MemberDetail
            label="Verified"
            value={
              member?.verified === true ||
              member?.isVerified === true
                ? "Yes"
                : "No"
            }
          />

          <MemberDetail
            label="Online"
            value={
              member?.online === true ||
              member?.isOnline === true
                ? "Online"
                : "Offline"
            }
          />

          <MemberDetail
            label="Join Date"
            value={formatDate(
              member?.joinDate
            )}
          />

        </div>

      </div>

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

function getInitials(name) {
  if (!name) {
    return "M";
  }

  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word.charAt(0).toUpperCase()
    )
    .join("") || "M";
}

function capitalize(value) {
  const text = String(value || "");

  if (!text) {
    return "—";
  }

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
    Number.isNaN(date.getTime())
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

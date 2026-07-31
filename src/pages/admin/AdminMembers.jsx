import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAdminMembers,
  deleteAdminMember,
} from "../../services/adminService";

import "./AdminMembers.css";

function AdminMembers() {
  // ========================================
  // DATA
  // ========================================

  const [members, setMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ========================================
  // SEARCH
  // ========================================

  const [search, setSearch] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");

  // ========================================
  // PAGINATION
  // ========================================

  const [page, setPage] =
    useState(1);

  const [limit] =
    useState(10);

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  // ========================================
  // SELECTED MEMBER
  // ========================================

  const [selectedMember, setSelectedMember] =
    useState(null);

  // ========================================
  // DELETE STATE
  // ========================================

  const [deletingId, setDeletingId] =
    useState(null);


  // ========================================
  // LOAD MEMBERS
  // ========================================

  const loadMembers = async () => {
    try {
      setLoading(true);
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

      setMembers(
        Array.isArray(response.members)
          ? response.members
          : []
      );

      setTotal(
        Number(response.total) || 0
      );

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

    setSearch(
      searchInput.trim()
    );
  };


  // ========================================
  // DELETE MEMBER
  // ========================================

  const handleDelete = async (
    member
  ) => {
    const memberId =
      member._id || member.id;

    if (!memberId) return;

    const confirmed =
      window.confirm(
        `Are you sure you want to remove ${member.fullName || "this member"}?`
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
            "Unable to delete member."
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
          "Unable to delete member."
      );

    } finally {
      setDeletingId(null);
    }
  };


  // ========================================
  // SUMMARY
  // ========================================

  const activeMembers =
    members.filter(
      (member) =>
        member.status === "active"
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        member.status === "inactive"
    ).length;

  const suspendedMembers =
    members.filter(
      (member) =>
        member.status === "suspended"
    ).length;


  // ========================================
  // DISPLAYED MEMBERS
  // ========================================

  const displayedMembers =
    useMemo(
      () => members,
      [members]
    );


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
            onClick={loadMembers}
            disabled={loading}
          >
            {loading
              ? "Loading..."
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
            onSubmit={handleSearch}
          >

            <span>
              🔎
            </span>

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

            <button
              type="submit"
            >
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

          ) : displayedMembers.length === 0 ? (

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


                          {/* MEMBER NUMBER */}

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
// MEMBER DETAILS MODAL
// ========================================

function MemberDetailsModal({
  member,
  onClose,
}) {
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

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close member profile"
          >
            ×
          </button>

        </div>


        <div className="admin-member-modal-body">

          <MemberDetail
            label="Member Number"
            value={
              member.memberNumber
            }
          />

          <MemberDetail
            label="Username"
            value={
              member.username
            }
          />

          <MemberDetail
            label="Email"
            value={
              member.email
            }
          />

          <MemberDetail
            label="Phone"
            value={
              member.phone
            }
          />

          <MemberDetail
            label="Department"
            value={
              member.department
            }
          />

          <MemberDetail
            label="Position"
            value={
              member.position
            }
          />

          <MemberDetail
            label="Monthly Contribution"
            value={
              member.monthlyContribution !==
              undefined
                ? `KES ${Number(
                    member.monthlyContribution
                  ).toLocaleString()}`
                : "—"
            }
          />

          <MemberDetail
            label="Status"
            value={
              capitalize(
                member.status ||
                  "active"
              )
            }
          />

          <MemberDetail
            label="Verified"
            value={
              member.verified
                ? "Yes"
                : "No"
            }
          />

          <MemberDetail
            label="Online"
            value={
              member.online
                ? "Online"
                : "Offline"
            }
          />

          <MemberDetail
            label="Join Date"
            value={
              formatDate(
                member.joinDate
              )
            }
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
  const text =
    String(value);

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
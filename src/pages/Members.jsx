import { useEffect, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Eye,
  X,
} from "lucide-react";

function Member() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  // ===============================
  // FETCH MEMBERS
  // ===============================

  const fetchMembers = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/members"
      );

      const data = await response.json();

      if (response.ok) {
        setMembers(data);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error(
        "Failed to fetch members:",
        error
      );
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // ===============================
  // SEARCH
  // ===============================

  const filteredMembers =
    members.filter((member) => {
      const searchText =
        search.toLowerCase();

      return (
        member.fullName
          ?.toLowerCase()
          .includes(searchText) ||

        member.memberNumber
          ?.toLowerCase()
          .includes(searchText) ||

        member.phone
          ?.toLowerCase()
          .includes(searchText) ||

        member.department
          ?.toLowerCase()
          .includes(searchText) ||

        member.position
          ?.toLowerCase()
          .includes(searchText)
      );
    });

  // ===============================
  // MEMBER STATISTICS
  // ===============================

  const activeMembers =
    members.filter(
      (member) =>
        member.status?.toLowerCase() ===
        "active"
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        member.status?.toLowerCase() ===
        "inactive"
    ).length;

  const totalContributions =
    members.reduce(
      (total, member) =>
        total +
        Number(
          member.monthlyContribution || 0
        ),
      0
    );

  return (
    <div className="admin-page">

      {/* ===============================
          HEADER
      =============================== */}

      <div className="admin-page-header">

        <div>

          <p className="section-label">
            MEMBER DIRECTORY
          </p>

          <h1>
            Members
          </h1>

          <p>
            View Benevolent Midax members
            and their contribution information.
          </p>

        </div>

      </div>


      {/* ===============================
          STAT CARDS
      =============================== */}

      <div className="member-stats-grid">

        {/* TOTAL MEMBERS */}

        <div className="member-stat-card">

          <div className="stat-icon">
            <Users size={25} />
          </div>

          <div>
            <span>
              Total Members
            </span>

            <strong>
              {members.length}
            </strong>
          </div>

        </div>


        {/* ACTIVE MEMBERS */}

        <div className="member-stat-card">

          <div className="stat-icon">
            <UserCheck size={25} />
          </div>

          <div>
            <span>
              Active Members
            </span>

            <strong>
              {activeMembers}
            </strong>
          </div>

        </div>


        {/* INACTIVE MEMBERS */}

        <div className="member-stat-card">

          <div className="stat-icon">
            <UserX size={25} />
          </div>

          <div>
            <span>
              Inactive Members
            </span>

            <strong>
              {inactiveMembers}
            </strong>
          </div>

        </div>


        {/* CONTRIBUTIONS */}

        <div className="member-stat-card">

          <div className="stat-icon">
            <span
              style={{
                fontSize: "20px",
                fontWeight: "700",
              }}
            >
              KSh
            </span>
          </div>

          <div>
            <span>
              Monthly Contributions
            </span>

            <strong>
              KSh{" "}
              {totalContributions.toLocaleString()}
            </strong>
          </div>

        </div>

      </div>


      {/* ===============================
          SEARCH TOOLBAR
      =============================== */}

      <div className="member-toolbar">

        <div className="search-box">

          <Search size={20} />

          <input
            type="text"
            placeholder="Search by name, member number, phone or department..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

      </div>


      {/* ===============================
          MEMBERS TABLE
      =============================== */}

      <div className="members-table-container">

        <table className="members-table">

          <thead>

            <tr>

              <th>
                Member
              </th>

              <th>
                Member No.
              </th>

              <th>
                Phone
              </th>

              <th>
                Department
              </th>

              <th>
                Monthly Contribution
              </th>

              <th>
                Status
              </th>

              <th>
                View
              </th>

            </tr>

          </thead>


          <tbody>

            {filteredMembers.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  className="empty-state"
                >
                  <Users size={35} />

                  <p>
                    No members found.
                  </p>

                </td>

              </tr>

            ) : (

              filteredMembers.map(
                (member) => (

                  <tr
                    key={member._id}
                  >

                    {/* MEMBER */}

                    <td>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >

                        <strong>
                          {member.fullName}
                        </strong>

                        <small>
                          {member.email ||
                            "No email provided"}
                        </small>

                      </div>

                    </td>


                    {/* MEMBER NUMBER */}

                    <td>
                      {member.memberNumber}
                    </td>


                    {/* PHONE */}

                    <td>
                      {member.phone}
                    </td>


                    {/* DEPARTMENT */}

                    <td>

                      {member.department ||
                        "—"}

                    </td>


                    {/* CONTRIBUTION */}

                    <td>

                      <strong>

                        KSh{" "}

                        {Number(
                          member.monthlyContribution ||
                            0
                        ).toLocaleString()}

                      </strong>

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={`status-badge ${
                          member.status?.toLowerCase() ===
                          "active"
                            ? "active"
                            : "inactive"
                        }`}
                      >

                        {member.status ||
                          "inactive"}

                      </span>

                    </td>


                    {/* VIEW */}

                    <td>

                      <button
                        className="edit-button"
                        title="View member"
                        onClick={() =>
                          setSelectedMember(
                            member
                          )
                        }
                      >

                        <Eye
                          size={17}
                        />

                      </button>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>


      {/* ===============================
          VIEW MEMBER MODAL
      =============================== */}

      {selectedMember && (

        <div className="modal-overlay">

          <div className="member-modal">

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <p className="section-label">
                  MEMBER PROFILE
                </p>

                <h2>
                  {selectedMember.fullName}
                </h2>

              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedMember(null)
                }
              >

                <X size={22} />

              </button>

            </div>


            {/* MEMBER DETAILS */}

            <div
              className="member-details"
              style={{
                display: "grid",
                gap: "18px",
              }}
            >

              <div>

                <small>
                  Member Number
                </small>

                <strong>
                  {selectedMember.memberNumber}
                </strong>

              </div>


              <div>

                <small>
                  Phone
                </small>

                <strong>
                  {selectedMember.phone}
                </strong>

              </div>


              <div>

                <small>
                  Email
                </small>

                <strong>
                  {selectedMember.email ||
                    "Not provided"}
                </strong>

              </div>


              <div>

                <small>
                  Department
                </small>

                <strong>
                  {selectedMember.department ||
                    "Not provided"}
                </strong>

              </div>


              <div>

                <small>
                  Position
                </small>

                <strong>
                  {selectedMember.position ||
                    "Not provided"}
                </strong>

              </div>


              <div>

                <small>
                  Monthly Contribution
                </small>

                <strong>
                  KSh{" "}
                  {Number(
                    selectedMember.monthlyContribution ||
                      0
                  ).toLocaleString()}
                </strong>

              </div>


              <div>

                <small>
                  Membership Status
                </small>

                <span
                  className={`status-badge ${
                    selectedMember.status?.toLowerCase() ===
                    "active"
                      ? "active"
                      : "inactive"
                  }`}
                >
                  {selectedMember.status}
                </span>

              </div>


              <div>

                <small>
                  Joined
                </small>

                <strong>
                  {selectedMember.joinDate
                    ? new Date(
                        selectedMember.joinDate
                      ).toLocaleDateString(
                        "en-KE",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : "Not available"}
                </strong>

              </div>

            </div>


            {/* CLOSE BUTTON */}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setSelectedMember(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Member;
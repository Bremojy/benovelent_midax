import { useEffect, useMemo, useState } from "react";
import "./MembersManagement.css";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Loader2,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function MembersManagement() {

  // ==========================================
  // STATE
  // ==========================================

  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingMember, setEditingMember] = useState(null);

  const [formData, setFormData] = useState({
    fullName: "",
    memberNumber: "",
    phone: "",
    email: "",
    department: "",
    position: "",
    monthlyContribution: "",
    joinDate: "",
    status: "active",
    notes: "",
  });

  // ==========================================
  // FETCH MEMBERS
  // ==========================================

  const fetchMembers = async () => {

    try {

      setLoading(true);

      const response = await fetch(
        `${API_URL}/members`
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message || "Unable to fetch members."
        );

      }

      setMembers(data);

    } catch (error) {

      console.error(error);

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchMembers();

  }, []);

  // ==========================================
  // INPUT
  // ==========================================

  const handleChange = (e) => {

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

  };

  // ==========================================
  // OPEN ADD
  // ==========================================

  const openAddModal = () => {

    setEditingMember(null);

    setFormData({
      fullName: "",
      memberNumber: "",
      phone: "",
      email: "",
      department: "",
      position: "",
      monthlyContribution: "",
      joinDate: "",
      status: "active",
      notes: "",
    });

    setShowModal(true);

  };

  // ==========================================
  // OPEN EDIT
  // ==========================================

  const openEditModal = (member) => {

    setEditingMember(member);

    setFormData({

      fullName: member.fullName || "",

      memberNumber: member.memberNumber || "",

      phone: member.phone || "",

      email: member.email || "",

      department: member.department || "",

      position: member.position || "",

      monthlyContribution:
        member.monthlyContribution || "",

      joinDate:
        member.joinDate
          ? member.joinDate.substring(0, 10)
          : "",

      status:
        member.status || "active",

      notes:
        member.notes || "",

    });

    setShowModal(true);

  };

  // ==========================================
  // SAVE MEMBER
  // ==========================================

  const saveMember = async (e) => {

    e.preventDefault();

    try {

      setSaving(true);

      const url = editingMember
        ? `${API_URL}/members/${editingMember._id}`
        : `${API_URL}/members`;

      const method =
        editingMember ? "PUT" : "POST";

      const response = await fetch(url, {

        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(formData),

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message || "Unable to save member."
        );

      }

      alert(
        editingMember
          ? "Member updated successfully."
          : "Member added successfully."
      );

      setShowModal(false);

      setEditingMember(null);

      fetchMembers();

    } catch (error) {

      console.error(error);

      alert(error.message);

    } finally {

      setSaving(false);

    }

  };

  // ==========================================
  // DELETE MEMBER
  // ==========================================

  const deleteMember = async (id) => {

    const confirmed = window.confirm(
      "Delete this member?"
    );

    if (!confirmed) return;

    try {

      const response = await fetch(

        `${API_URL}/members/${id}`,

        {
          method: "DELETE",
        }

      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message || "Unable to delete member."
        );

      }

      fetchMembers();

    } catch (error) {

      console.error(error);

      alert(error.message);

    }

  };

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredMembers = useMemo(() => {

    const keyword = search.toLowerCase();

    return members.filter((member) =>

      member.fullName
        ?.toLowerCase()
        .includes(keyword)

      ||

      member.memberNumber
        ?.toLowerCase()
        .includes(keyword)

      ||

      member.phone
        ?.toLowerCase()
        .includes(keyword)

      ||

      member.department
        ?.toLowerCase()
        .includes(keyword)

    );

  }, [members, search]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalMembers = members.length;

  const activeMembers = members.filter(
    (member) => member.status === "active"
  ).length;

  const inactiveMembers = members.filter(
    (member) => member.status === "inactive"
  ).length;

  const totalContributions = members.reduce(

    (sum, member) =>

      sum + Number(member.monthlyContribution || 0),

    0

  );

  // ==========================================
  // RETURN STARTS IN PART 2
  // ==========================================

return (
  <div className="members-management">

    {/* ===========================
        PAGE HEADER
    =========================== */}

    <div className="page-header">

      <div>

        <p className="section-label">
          ADMINISTRATION
        </p>

        <h1>
          Member Management
        </h1>

        <p className="page-description">
          Add, edit, search and manage all registered Benevolent Midax members.
        </p>

      </div>

      <button
        className="primary-button"
        onClick={openAddModal}
      >
        <Plus size={18} />

        Add Member

      </button>

    </div>


    {/* ===========================
        STATISTICS
    =========================== */}

    <div className="stats-grid">

      <div className="stat-card">

        <Users size={30} />

        <div>

          <span>Total Members</span>

          <h2>{totalMembers}</h2>

        </div>

      </div>


      <div className="stat-card">

        <UserCheck size={30} />

        <div>

          <span>Active Members</span>

          <h2>{activeMembers}</h2>

        </div>

      </div>


      <div className="stat-card">

        <UserX size={30} />

        <div>

          <span>Inactive</span>

          <h2>{inactiveMembers}</h2>

        </div>

      </div>


      <div className="stat-card">

        <Wallet size={30} />

        <div>

          <span>Monthly Contributions</span>

          <h2>

            KSh{" "}

            {totalContributions.toLocaleString()}

          </h2>

        </div>

      </div>

    </div>


    {/* ===========================
        SEARCH
    =========================== */}

    <div className="toolbar">

      <div className="search-box">

        <Search size={18} />

        <input
          type="text"
          placeholder="Search member..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

    </div>


    {/* ===========================
        TABLE
    =========================== */}

    <div className="table-card">

      {loading ? (

        <div className="loading-box">

          <Loader2
            className="spin"
            size={40}
          />

          <p>
            Loading members...
          </p>

        </div>

      ) : (

        <table className="members-table">

          <thead>

            <tr>

              <th>Member No.</th>

              <th>Name</th>

              <th>Phone</th>

              <th>Department</th>

              <th>Contribution</th>

              <th>Status</th>

              <th>Actions</th>

            </tr>

          </thead>

          <tbody>

            {filteredMembers.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  className="empty-state"
                >

                  No members found.

                </td>

              </tr>

            ) : (

              filteredMembers.map((member) => (

                <tr
                  key={member._id}
                >

                  <td>

                    {member.memberNumber}

                  </td>

                  <td>

                    <div className="member-info">

                      <strong>

                        {member.fullName}

                      </strong>

                      <small>

                        {member.email}

                      </small>

                    </div>

                  </td>

                  <td>

                    {member.phone}

                  </td>

                  <td>

                    {member.department || "-"}

                  </td>

                  <td>

                    KSh{" "}

                    {Number(
                      member.monthlyContribution || 0
                    ).toLocaleString()}

                  </td>

                  <td>

                    <span
                      className={`status ${member.status}`}
                    >

                      {member.status}

                    </span>

                  </td>

                  <td>

                    <div className="actions">

                      <button
                        className="edit-btn"
                        onClick={() =>
                          openEditModal(member)
                        }
                      >

                        <Pencil size={17} />

                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteMember(member._id)
                        }
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      )}

    </div>

    {/* ==========================================
    ADD / EDIT MEMBER MODAL
========================================== */}

{showModal && (

  <div
    className="modal-overlay"
    onClick={() => setShowModal(false)}
  >

    <div
      className="member-modal"
      onClick={(e) => e.stopPropagation()}
    >

      {/* HEADER */}

      <div className="modal-header">

        <div>

          <p className="section-label">

            MEMBER MANAGEMENT

          </p>

          <h2>

            {editingMember
              ? "Edit Member"
              : "Add New Member"}

          </h2>

        </div>

        <button
          className="close-button"
          onClick={() => setShowModal(false)}
        >

          <X size={20} />

        </button>

      </div>


      {/* FORM */}

      <form
        className="member-form"
        onSubmit={saveMember}
      >

        <div className="form-group">

          <label>

            Full Name

          </label>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />

        </div>


        <div className="form-row">

          <div className="form-group">

            <label>

              Member Number

            </label>

            <input
              type="text"
              name="memberNumber"
              value={formData.memberNumber}
              onChange={handleChange}
              required
            />

          </div>

          <div className="form-group">

            <label>

              Phone

            </label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />

          </div>

        </div>


        <div className="form-row">

          <div className="form-group">

            <label>

              Email

            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />

          </div>

          <div className="form-group">

            <label>

              Department

            </label>

            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
            />

          </div>

        </div>


        <div className="form-row">

          <div className="form-group">

            <label>

              Position

            </label>

            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
            />

          </div>

          <div className="form-group">

            <label>

              Monthly Contribution

            </label>

            <input
              type="number"
              name="monthlyContribution"
              value={formData.monthlyContribution}
              onChange={handleChange}
              required
            />

          </div>

        </div>


        <div className="form-row">

          <div className="form-group">

            <label>

              Join Date

            </label>

            <input
              type="date"
              name="joinDate"
              value={formData.joinDate}
              onChange={handleChange}
            />

          </div>

          <div className="form-group">

            <label>

              Status

            </label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >

              <option value="active">

                Active

              </option>

              <option value="inactive">

                Inactive

              </option>

            </select>

          </div>

        </div>


        <div className="form-group">

          <label>

            Notes

          </label>

          <textarea
            name="notes"
            rows="4"
            value={formData.notes}
            onChange={handleChange}
          />

        </div>


        {/* BUTTONS */}

        <div className="modal-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowModal(false)}
          >

            Cancel

          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >

            {saving ? (

              <>
                <Loader2
                  className="spin"
                  size={18}
                />

                Saving...

              </>

            ) : editingMember ? (

              "Update Member"

            ) : (

              "Save Member"

            )}

          </button>

        </div>

      </form>

    </div>

  </div>

)}

  </div>
);

}
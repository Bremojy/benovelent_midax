function MembersPage({
  members,
  filteredMembers,
  memberSearch,
  setMemberSearch,
  deleteMember,
}) {
  return (
    <div className="members-page">

      <div className="members-toolbar">

        <input
          type="text"
          placeholder="Search member..."
          value={memberSearch}
          onChange={(e) =>
            setMemberSearch(e.target.value)
          }
        />

      </div>

      <div className="admin-table-container">

        <table className="admin-table">

          <thead>

            <tr>
              <th>Member No</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {filteredMembers.map((member) => (

              <tr key={member._id}>

                <td>{member.memberNumber}</td>

                <td>{member.fullName}</td>

                <td>{member.phone}</td>

                <td>{member.status}</td>

                <td>

                  <button
                    className="danger-btn"
                    onClick={() =>
                      deleteMember(member._id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default MembersPage;
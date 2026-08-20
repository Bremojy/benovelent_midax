import {
  User,
  BadgeCheck,
  Calendar,
  Building2,
} from "lucide-react";

import "../../styles/member.css";

function MembershipCard() {

  const member = {
    number: "BM00124",
    status: "Active",
    department: "Main Branch",
    joined: "15 Jan 2024",
  };

  return (

    <div className="member-card">

      <h3>Membership Details</h3>

      <div className="member-item">

        <User size={18} />

        <span>Member No.</span>

        <strong>{member.number}</strong>

      </div>

      <div className="member-item">

        <BadgeCheck size={18} />

        <span>Status</span>

        <strong className="active-status">
          {member.status}
        </strong>

      </div>

      <div className="member-item">

        <Building2 size={18} />

        <span>Department</span>

        <strong>{member.department}</strong>

      </div>

      <div className="member-item">

        <Calendar size={18} />

        <span>Joined</span>

        <strong>{member.joined}</strong>

      </div>

    </div>

  );

}

export default MembershipCard;
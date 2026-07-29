import {
    Mail,
    Phone,
    Briefcase,
    Building2,
    BadgeCheck,
    Calendar,
    Pencil,
} from "lucide-react";

import "./ProfileCard.css";

function ProfileCard({

    member,

    onEdit,

}) {

    return (

        <div className="profile-card">

            {/* PROFILE HEADER */}

            <div className="profile-header">

                <img
                    src={
                        member?.profileImage ||
                        "/default-avatar.png"
                    }
                    alt="Profile"
                    className="profile-image"
                />

                <div className="profile-info">

                    <h2>

                        {member?.fullName || "Member Name"}

                    </h2>

                    <span className="member-number">

                        {member?.memberNumber || "MIDAX-0001"}

                    </span>

                    <div
                        className={
                            member?.status === "inactive"
                                ? "status inactive"
                                : "status active"
                        }
                    >
                        <BadgeCheck size={16} />

                        {member?.status || "Active"}

                    </div>

                </div>

                <button
                    className="edit-profile-btn"
                    onClick={onEdit}
                >

                    <Pencil size={18} />

                    Edit

                </button>

            </div>

            {/* DETAILS */}

            <div className="profile-details">

                <div className="detail-item">

                    <Mail size={18} />

                    <span>

                        {member?.email}

                    </span>

                </div>

                <div className="detail-item">

                    <Phone size={18} />

                    <span>

                        {member?.phone}

                    </span>

                </div>

                <div className="detail-item">

                    <Building2 size={18} />

                    <span>

                        {member?.department}

                    </span>

                </div>

                <div className="detail-item">

                    <Briefcase size={18} />

                    <span>

                        {member?.position}

                    </span>

                </div>

                <div className="detail-item">

                    <Calendar size={18} />

                    <span>

                        Joined

                        {" "}

                        {member?.joinDate
                            ? new Date(
                                  member.joinDate
                              ).toLocaleDateString()
                            : "--"}

                    </span>

                </div>

            </div>

        </div>

    );

}

export default ProfileCard;
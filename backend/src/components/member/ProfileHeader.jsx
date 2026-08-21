import {
  BadgeCheck,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Calendar,
} from "lucide-react";

import "./ProfileHeader.css";

function ProfileHeader({ member }) {
  return (
    <div className="profile-card">

      <div
        className="profile-cover"
        style={{
          backgroundImage: `url(${
            member?.coverImage ||
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200"
          })`,
        }}
      />

      <div className="profile-body">

        <div className="profile-left">

          <div className="profile-avatar">

            <img
              src={
                member?.profileImage ||
                "https://ui-avatars.com/api/?background=ff7a00&color=fff&name=" +
                  encodeURIComponent(member?.fullName || "Member")
              }
              alt=""
            />

            {member?.online && (
              <span className="online-dot"></span>
            )}

          </div>

          <div>

            <h2>

              {member?.fullName}

              {member?.verified && (
                <BadgeCheck
                  size={18}
                  color="#ff7a00"
                />
              )}

            </h2>

            <p>
              Member No.
              {" "}
              {member?.memberNumber}
            </p>

            <span className="member-status">
              {member?.status}
            </span>

          </div>

        </div>

        <a className="edit-profile-btn" href="/member/profile">
          Edit Profile
        </a>

      </div>

      <div className="profile-info">

        <div>
          <Mail size={18}/>
          {member?.email}
        </div>

        <div>
          <Phone size={18}/>
          {member?.phone}
        </div>

        <div>
          <Building2 size={18}/>
          {member?.department || "Department"}
        </div>

        <div>
          <Briefcase size={18}/>
          {member?.position || "Member"}
        </div>

        <div>
          <Calendar size={18}/>
          Joined{" "}
          {new Date(
            member?.joinDate
          ).toLocaleDateString()}
        </div>

      </div>

      <div className="profile-bio">

        <h3>About</h3>

        <p>

          {member?.bio ||
            "No biography added yet."}

        </p>

      </div>

    </div>
  );
}

export default ProfileHeader;
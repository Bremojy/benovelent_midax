import {
  Users,
  Wallet,
  HandHeart,
  Newspaper,
  Vote,
  MessageCircle,
  Bell,
  UserPlus,
  PlusCircle,
  ImagePlus,
  ArrowUpRight,
} from "lucide-react";

function DashboardHome({
  members = [],
  transactions = [],
  claims = [],
  navigateTo,
}) {
  const totalMembers = members.length;

  const totalContributions = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalClaims = claims.length;

  const pendingClaims = claims.filter(
    (c) => c.status === "Pending"
  ).length;

  return (
    <div className="dashboard-home">

      {/* HERO */}

      <section className="dashboard-hero">

        <div>

          <h1>
            Welcome back 👋
          </h1>

          <p>
            Manage Benovelent Midax from one
            beautiful dashboard.
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() => navigateTo("members")}
        >
          <UserPlus size={18} />
          Add Member
        </button>

      </section>

      {/* STATS */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <Users size={35} />

          <h2>
            {totalMembers}
          </h2>

          <span>Total Members</span>

        </div>

        <div className="stat-card">

          <Wallet size={35} />

          <h2>
            KSh {totalContributions.toLocaleString()}
          </h2>

          <span>Total Contributions</span>

        </div>

        <div className="stat-card">

          <HandHeart size={35} />

          <h2>
            {totalClaims}
          </h2>

          <span>Total Claims</span>

        </div>

        <div className="stat-card">

          <Bell size={35} />

          <h2>
            {pendingClaims}
          </h2>

          <span>Pending Claims</span>

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div className="dashboard-section">

        <div className="section-header">

          <h2>
            Quick Actions
          </h2>

          <ArrowUpRight />

        </div>

        <div className="quick-grid">

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("members")
            }
          >
            <UserPlus size={30} />

            <h3>Add Member</h3>

            <p>
              Register a new member.
            </p>

          </button>

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("leaders")
            }
          >
            <PlusCircle size={30} />

            <h3>Add Leader</h3>

            <p>
              Manage leadership team.
            </p>

          </button>

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("carousel")
            }
          >
            <ImagePlus size={30} />

            <h3>Upload Banner</h3>

            <p>
              Change homepage carousel.
            </p>

          </button>

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("news")
            }
          >
            <Newspaper size={30} />

            <h3>Create News</h3>

            <p>
              Publish announcements.
            </p>

          </button>

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("polls")
            }
          >
            <Vote size={30} />

            <h3>Create Poll</h3>

            <p>
              Let members vote.
            </p>

          </button>

          <button
            className="quick-card"
            onClick={() =>
              navigateTo("messages")
            }
          >
            <MessageCircle size={30} />

            <h3>Messages</h3>

            <p>
              Open member chats.
            </p>

          </button>

        </div>

      </div>

    </div>
  );
}

export default DashboardHome;
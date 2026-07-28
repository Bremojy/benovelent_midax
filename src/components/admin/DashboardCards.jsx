import {
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";

function DashboardCards({
  members,
  totalContributions,
  totalPayouts,
  currentBalance,
}) {
  return (
    <div className="admin-stats">

      <div className="admin-stat-card">
        <Users />

        <div>
          <span>Total Members</span>

          <strong>
            {members.length}
          </strong>
        </div>
      </div>

      <div className="admin-stat-card">
        <TrendingUp />

        <div>
          <span>Contributions</span>

          <strong>
            KSh{" "}
            {totalContributions.toLocaleString()}
          </strong>
        </div>
      </div>

      <div className="admin-stat-card">
        <TrendingDown />

        <div>
          <span>Assistance Paid</span>

          <strong>
            KSh{" "}
            {totalPayouts.toLocaleString()}
          </strong>
        </div>
      </div>

      <div className="admin-stat-card">
        <Wallet />

        <div>
          <span>Current Balance</span>

          <strong>
            KSh{" "}
            {currentBalance.toLocaleString()}
          </strong>
        </div>
      </div>

    </div>
  );
}

export default DashboardCards;
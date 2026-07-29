import {
  Wallet,
  TrendingUp,
  Calendar,
  BadgeDollarSign,
} from "lucide-react";

import "./ContributionSummary.css";

function ContributionSummary({
  statistics,
}) {
  return (
    <section className="wallet-summary">

      <div className="wallet-card balance">

        <Wallet size={34} />

        <span>Total Contributions</span>

        <h2>
          KSh {Number(
            statistics?.totalContribution || 0
          ).toLocaleString()}
        </h2>

      </div>

      <div className="wallet-card">

        <TrendingUp size={30} />

        <span>This Month</span>

        <h3>
          KSh {Number(
            statistics?.monthlyContribution || 0
          ).toLocaleString()}
        </h3>

      </div>

      <div className="wallet-card">

        <Calendar size={30} />

        <span>Last Payment</span>

        <h3>

          {statistics?.lastPaymentDate
            ? new Date(
                statistics.lastPaymentDate
              ).toLocaleDateString()
            : "No Payment"}

        </h3>

      </div>

      <div className="wallet-card">

        <BadgeDollarSign size={30} />

        <span>Status</span>

        <h3>

          {statistics?.paymentStatus ||
            "Up To Date"}

        </h3>

      </div>

    </section>
  );
}

export default ContributionSummary;
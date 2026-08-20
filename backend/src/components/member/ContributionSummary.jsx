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
  const scheme = statistics?.scheme || {};
  return (
    <section className="wallet-summary">

      <div className="wallet-card balance">

        <Wallet size={34} />

        <span>Scheme Collected</span>

        <h2>
          KSh {Number(
            scheme?.totalCollected || 0
          ).toLocaleString()}
        </h2>

      </div>

      <div className="wallet-card">

        <TrendingUp size={30} />

        <span>Standard Monthly Deduction</span>

        <h3>
          KSh {Number(
            scheme?.standardMonthlyDeduction || 0
          ).toLocaleString()}
        </h3>

      </div>

      <div className="wallet-card">

        <Calendar size={30} />

        <span>Members Charged</span>

        <h3>

          {Number(scheme?.membersChargedThisMonth || 0).toLocaleString()}

        </h3>

      </div>

      <div className="wallet-card">

        <BadgeDollarSign size={30} />

        <span>Collection Status</span>

        <h3>

          {scheme?.outstandingThisMonth ? "Collection in progress" : "Up to date"}

        </h3>

      </div>

    </section>
  );
}

export default ContributionSummary;
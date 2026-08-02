import {
  useEffect,
  useState,
} from "react";

import DashboardLayout
  from "../../layouts/DashboardLayout";

import {
  getMemberContributions,
  getMemberFinance,
} from "../../services/memberService";

import "./Contributions.css";

export default function Contributions() {
  const [data, setData] =
    useState(null);
  const [finance, setFinance] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadContributions =
    async () => {
      try {
        setLoading(true);
        setError("");

        const [response, financeResponse] = await Promise.all([
          getMemberContributions(),
          getMemberFinance(),
        ]);

        if (
          !response?.success
        ) {
          throw new Error(
            response?.message ||
              "Unable to load contributions."
          );
        }

        setData(response);
        setFinance(Array.isArray(financeResponse?.transactions) ? financeResponse.transactions : []);

      } catch (err) {
        console.error(
          "Contributions error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load contributions."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadContributions();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="member-page-loading">
          <div className="page-spinner"></div>

          <h3>
            Loading contributions...
          </h3>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="member-page-error">

          <h2>
            Contributions unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={loadContributions}
          >
            Try Again
          </button>

        </div>
      </DashboardLayout>
    );
  }

  const summary =
    data?.summary || {};

  const contributions =
    Array.isArray(
      data?.contributions
    )
      ? data.contributions
      : [];

  return (
    <DashboardLayout>

      <div className="member-contributions-page">

        {/* HEADER */}

        <section className="member-page-header">

          <div>
            <span>
              MEMBER FINANCIAL RECORD
            </span>

            <h1>
              My Contributions
            </h1>

            <p>
              View your contribution history
              and payment records.
            </p>
          </div>

        </section>


        {/* SUMMARY */}

        <section className="contribution-summary-grid">

          <ContributionSummaryCard
            title="Monthly Contribution"
            value={
              formatCurrency(
                summary.monthlyContribution
              )
            }
          />

          <ContributionSummaryCard
            title="Total Contributed"
            value={
              formatCurrency(
                summary.totalContributed
              )
            }
          />

          <ContributionSummaryCard
            title="Current Year"
            value={
              formatCurrency(
                summary.currentYear
              )
            }
          />

          <ContributionSummaryCard
            title="Outstanding"
            value={
              formatCurrency(
                summary.outstanding
              )
            }
          />

        </section>


        {/* HISTORY */}

        <section className="contribution-history-card">

          <div className="member-section-heading">

            <div>
              <span>
                PAYMENT HISTORY
              </span>

              <h2>
                Contribution History
              </h2>
            </div>

            <strong>
              {contributions.length}
            </strong>

          </div>


          {contributions.length === 0 ? (

            <div className="empty-member-state">

              <div>
                ₵
              </div>

              <h3>
                No contributions found
              </h3>

              <p>
                Your contribution records
                will appear here once available.
              </p>

            </div>

          ) : (

            <div className="contribution-table-wrapper">

              <table className="contribution-table">

                <thead>

                  <tr>
                    <th>
                      Date
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Method
                    </th>

                    <th>
                      Reference
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {contributions.map(
                    (item, index) => {

                      const id =
                        item._id ||
                        item.id ||
                        index;

                      return (
                        <tr
                          key={id}
                        >

                          <td>
                            {formatDate(
                              item.date ||
                              item.createdAt
                            )}
                          </td>

                          <td className="amount-cell">
                            {formatCurrency(
                              item.amount
                            )}
                          </td>

                          <td>
                            {item.method ||
                              item.paymentMethod ||
                              "—"}
                          </td>

                          <td>
                            {item.reference ||
                              item.transactionReference ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`payment-status ${
                                String(
                                  item.status ||
                                  "pending"
                                ).toLowerCase()
                              }`}
                            >
                              {
                                item.status ||
                                "Pending"
                              }
                            </span>
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="contribution-history-card finance-ledger-card">
          <div className="member-section-heading">
            <div>
              <span>SUPPORT & FINANCE LEDGER</span>
              <h2>Transactions linked to your membership</h2>
            </div>
            <strong>{finance.length}</strong>
          </div>
          {finance.length === 0 ? (
            <div className="empty-member-state"><h3>No support transactions recorded</h3><p>Approved support and finance transactions will appear here.</p></div>
          ) : (
            <div className="contribution-table-wrapper">
              <table className="contribution-table">
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{finance.map((item,index)=><tr key={item._id||index}><td>{formatDate(item.transactionDate||item.createdAt)}</td><td>{item.type||"—"}</td><td>{item.description||item.category||"—"}</td><td className="amount-cell">{formatCurrency(item.amount)}</td><td><span className={`payment-status ${String(item.status||"pending").toLowerCase()}`}>{item.status||"Pending"}</span></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>

      </div>

    </DashboardLayout>
  );
}


// =========================================
// SUMMARY CARD
// =========================================

function ContributionSummaryCard({
  title,
  value,
}) {
  return (
    <div className="contribution-summary-card">

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// =========================================
// FORMATTERS
// =========================================

function formatCurrency(
  value
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    }
  ).format(amount);
}


function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}
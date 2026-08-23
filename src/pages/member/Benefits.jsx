import {
  useEffect,
  useState,
} from "react";

import DashboardLayout
  from "../../layouts/DashboardLayout";

import {
  getMemberBenefits,
} from "../../services/memberService";

import "./Benefits.css";

export default function Benefits() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {

    const loadBenefits =
      async () => {

        try {

          const response =
            await getMemberBenefits();

          if (
            !response?.success
          ) {
            throw new Error(
              response?.message ||
                "Unable to load benefits."
            );
          }

          setData(response);

        } catch (err) {

          console.error(
            "Benefits error:",
            err
          );

          setError(
            err.response?.data?.message ||
            err.message ||
            "Unable to load benefits."
          );

        } finally {
          setLoading(false);
        }
      };

    loadBenefits();

  }, []);


  if (loading) {
    return (
      <DashboardLayout>

        <div className="benefits-loading">
          Loading your benefits...
        </div>

      </DashboardLayout>
    );
  }


  if (error) {
    return (
      <DashboardLayout>

        <div className="benefits-error">

          <h2>
            Benefits unavailable
          </h2>

          <p>
            {error}
          </p>

        </div>

      </DashboardLayout>
    );
  }


  const benefits =
    Array.isArray(
      data?.benefits
    )
      ? data.benefits
      : [];

  const policies = Array.isArray(data?.policies) ? data.policies : [];


  return (
    <DashboardLayout>

      <div className="member-benefits-page">

        <section className="member-page-header">

          <span>
            MEMBER BENEFITS
          </span>

          <h1>
            My Benefits
          </h1>

          <p>
            View the benefits and support
            available through your membership.
          </p>

        </section>


        <section className="benefits-grid-page">

          {benefits.length === 0 ? (

            <div className="benefits-empty">

              <h3>
                No benefit information available
              </h3>

              <p>
                Benefit information will
                appear here once available.
              </p>

            </div>

          ) : (

            benefits.map(
              (benefit, index) => (

                <div
                  className={`member-benefit-card ${
                    benefit.eligible
                      ? "eligible"
                      : "unavailable"
                  }`}
                  key={
                    benefit._id ||
                    index
                  }
                >

                  <div className="benefit-card-top">

                    <div className="benefit-card-icon">
                      {getIcon(
                        benefit.type ||
                        benefit.name
                      )}
                    </div>

                    <span
                      className="benefit-eligibility"
                    >
                      {benefit.eligible
                        ? "Eligible"
                        : "Not Eligible"}
                    </span>

                  </div>


                  <h2>
                    {benefit.name ||
                      benefit.title ||
                      "Member Benefit"}
                  </h2>


                  <p>
                    {benefit.description ||
                      "Benefit information is available through your membership."}
                  </p>


                  {benefit.limit && (
                    <div className="benefit-limit">

                      <span>
                        Support Limit
                      </span>

                      <strong>
                        {formatCurrency(
                          benefit.limit
                        )}
                      </strong>

                    </div>
                  )}

                </div>

              )
            )

          )}

        </section>


        {policies.length > 0 && (
          <section className="benefits-grid-page" style={{ marginTop: 18 }}>
            {policies.map((policy) => (
              <div className={`member-benefit-card ${policy.eligible && policy.enabled ? "eligible" : "unavailable"}`} key={policy._id}>
                <div className="benefit-card-top"><div className="benefit-card-icon">{policy.category === "loan" ? "🎓" : policy.category === "support" ? "🤝" : "📋"}</div><span className="benefit-eligibility">{policy.eligible && policy.enabled ? "Available" : "Unavailable"}</span></div>
                <h2>{policy.name}</h2><p>{policy.description || "Policy details are managed by SuperAdmin."}</p>
                {policy.maxAmount > 0 && <div className="benefit-limit"><span>Maximum</span><strong>{formatCurrency(policy.maxAmount)}</strong></div>}
                {policy.repaymentEnabled && <div className="benefit-limit"><span>Repayment</span><strong>{Number(policy.interestRate || 0)}% • {Number(policy.repaymentMonths || 12)} months</strong></div>}
              </div>
            ))}
          </section>
        )}
      </div>

    </DashboardLayout>
  );
}


function getIcon(type) {

  const value =
    String(type || "")
      .toLowerCase();

  if (
    value.includes("medical")
  ) {
    return "🏥";
  }

  if (
    value.includes("funeral")
  ) {
    return "🕊️";
  }

  if (
    value.includes("education")
  ) {
    return "🎓";
  }

  return "🤝";
}


function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );
}
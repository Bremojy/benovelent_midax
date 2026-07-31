import {
  useEffect,
  useState,
} from "react";

import DashboardLayout
  from "../../layouts/DashboardLayout";

import {
  getMemberClaims,
  createMemberClaim,
} from "../../services/memberService";

import "./Support.css";

export default function Support() {
  const [claims, setClaims] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [form, setForm] =
    useState({
      type: "",
      amount: "",
      description: "",
    });

  const loadClaims =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getMemberClaims();

        if (
          !response?.success
        ) {
          throw new Error(
            response?.message ||
              "Unable to load support requests."
          );
        }

        setClaims(
          Array.isArray(
            response.claims
          )
            ? response.claims
            : []
        );

      } catch (err) {
        console.error(
          "Claims error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load support requests."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadClaims();
  }, []);


  const handleChange =
    (field, value) => {
      setForm(
        (current) => ({
          ...current,
          [field]: value,
        })
      );
    };


  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (!form.type) {
        setError(
          "Please select a support type."
        );

        return;
      }

      if (!form.description.trim()) {
        setError(
          "Please describe your request."
        );

        return;
      }

      try {
        setSubmitting(true);

        setError("");
        setSuccess("");

        const response =
          await createMemberClaim({
            type: form.type,
            amount:
              Number(
                form.amount || 0
              ),
            description:
              form.description.trim(),
          });

        if (
          !response?.success
        ) {
          throw new Error(
            response?.message ||
              "Unable to submit request."
          );
        }

        setSuccess(
          "Your support request has been submitted successfully."
        );

        setForm({
          type: "",
          amount: "",
          description: "",
        });

        await loadClaims();

      } catch (err) {
        console.error(
          "Submit claim error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to submit support request."
        );

      } finally {
        setSubmitting(false);
      }
    };


  return (
    <DashboardLayout>

      <div className="member-support-page">

        <section className="member-page-header">

          <span>
            MEMBER SUPPORT
          </span>

          <h1>
            Request Support
          </h1>

          <p>
            Submit and track your
            benevolent support requests.
          </p>

        </section>


        {error && (
          <div className="support-alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="support-alert success">
            {success}
          </div>
        )}


        <div className="support-layout">

          {/* FORM */}

          <section className="support-form-card">

            <div className="support-section-heading">

              <span>
                NEW REQUEST
              </span>

              <h2>
                Submit Support Request
              </h2>

            </div>


            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="support-field">

                <label>
                  Support Type
                </label>

                <select
                  value={
                    form.type
                  }
                  onChange={(e) =>
                    handleChange(
                      "type",
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Select support type
                  </option>

                  <option value="medical">
                    Medical Support
                  </option>

                  <option value="funeral">
                    Funeral Support
                  </option>

                  <option value="education">
                    Education Support
                  </option>

                </select>

              </div>


              <div className="support-field">

                <label>
                  Amount Requested
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.amount
                  }
                  onChange={(e) =>
                    handleChange(
                      "amount",
                      e.target.value
                    )
                  }
                  placeholder="KES 0"
                />

              </div>


              <div className="support-field">

                <label>
                  Description
                </label>

                <textarea
                  rows="6"
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Explain why you are requesting support..."
                />

              </div>


              <button
                className="support-submit-button"
                type="submit"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </button>

            </form>

          </section>


          {/* HISTORY */}

          <section className="support-history-card">

            <div className="support-section-heading">

              <span>
                MY REQUESTS
              </span>

              <h2>
                Support History
              </h2>

            </div>


            {loading ? (

              <div className="support-loading">
                Loading requests...
              </div>

            ) : claims.length === 0 ? (

              <div className="support-empty">

                <h3>
                  No requests yet
                </h3>

                <p>
                  Your support requests
                  will appear here.
                </p>

              </div>

            ) : (

              <div className="support-list">

                {claims.map(
                  (claim, index) => (

                    <div
                      className="support-item"
                      key={
                        claim._id ||
                        index
                      }
                    >

                      <div>

                        <strong>
                          {formatType(
                            claim.type
                          )}
                        </strong>

                        <span>
                          {formatDate(
                            claim.createdAt ||
                            claim.date
                          )}
                        </span>

                      </div>


                      <div className="support-item-right">

                        <strong>
                          {formatCurrency(
                            claim.amount
                          )}
                        </strong>

                        <span
                          className={`claim-status ${
                            String(
                              claim.status ||
                              "pending"
                            ).toLowerCase()
                          }`}
                        >
                          {
                            claim.status ||
                            "Pending"
                          }
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        </div>

      </div>

    </DashboardLayout>
  );
}


function formatType(type) {
  const value =
    String(type || "");

  return value
    .replace(
      /^./,
      (char) =>
        char.toUpperCase()
    )
    .replace(
      /_/g,
      " "
    );
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


function formatDate(value) {
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
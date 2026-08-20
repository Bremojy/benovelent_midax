import {
  HandHeart,
  Clock3,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";

import "./ClaimsOverview.css";

function ClaimsOverview({

  claims = [],

  onNewClaim,

}) {

  const approved =
    claims.filter(
      c => c.status === "Approved"
    ).length;

  const pending =
    claims.filter(
      c => c.status === "Pending"
    ).length;

  const rejected =
    claims.filter(
      c => c.status === "Rejected"
    ).length;

  return (

    <div className="claims-page">

      <div className="claims-header">

        <div>

          <h2>

            Assistance Centre

          </h2>

          <p>

            Submit requests and follow their
            approval progress.

          </p>

        </div>

        <button
          className="new-claim-btn"
          onClick={onNewClaim}
        >

          <Plus size={18}/>

          New Claim

        </button>

      </div>

      <div className="claim-summary">

        <div>

          <HandHeart size={30}/>

          <h3>

            {claims.length}

          </h3>

          <span>Total Claims</span>

        </div>

        <div>

          <Clock3 size={30}/>

          <h3>

            {pending}

          </h3>

          <span>Pending</span>

        </div>

        <div>

          <CheckCircle2 size={30}/>

          <h3>

            {approved}

          </h3>

          <span>Approved</span>

        </div>

        <div>

          <XCircle size={30}/>

          <h3>

            {rejected}

          </h3>

          <span>Rejected</span>

        </div>

      </div>

    </div>

  );

}

export default ClaimsOverview;
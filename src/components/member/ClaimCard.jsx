import ClaimTimeline from "./ClaimTimeline";
import StatusBadge from "../common/StatusBadge";

import "./ClaimCard.css";

function ClaimCard({

  claim,

}){

return(

<div className="claim-card">

<div className="claim-top">

<div>

<h3>

{claim.type}

</h3>

<p>

KES {Number(
claim.amount||0
).toLocaleString()}

</p>

</div>

<StatusBadge status={claim.status || "Pending"} />

</div>

<ClaimTimeline

status={claim.status}

/>

<p className="claim-date">

Submitted

{" "}

{new Date(
claim.createdAt
).toLocaleDateString()}

</p>

</div>

);

}

export default ClaimCard;
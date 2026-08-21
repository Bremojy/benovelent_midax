import {
  Download,
  CheckCircle,
} from "lucide-react";

import "./ContributionHistory.css";

function ContributionHistory({

  contributions=[]

}){

return(

<div className="history-card">

<div className="history-header">

<h2>

Contribution History

</h2>

</div>

<table>

<thead>

<tr>

<th>Date</th>

<th>Amount</th>

<th>Status</th>

<th></th>

</tr>

</thead>

<tbody>

{contributions.map((item)=>(

<tr key={item._id}>

<td>

{new Date(item.date)
.toLocaleDateString()}

</td>

<td>

KSh {Number(item.amount)
.toLocaleString()}

</td>

<td>

<span className="paid">

<CheckCircle size={16}/>

Paid

</span>

</td>

<td>

<button type="button" onClick={() => {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=760");
  if (!popup) return;
  const safeDate = new Date(item.date).toLocaleDateString();
  const safeAmount = Number(item.amount).toLocaleString();
  popup.document.write(`<!doctype html><html><head><title>Contribution Receipt</title></head><body style="font-family:Arial,sans-serif;padding:32px;line-height:1.6"><h1>Benevolent MIDAX</h1><h2>Contribution Receipt</h2><p><strong>Date:</strong> ${safeDate}</p><p><strong>Amount:</strong> KSh ${safeAmount}</p><p><strong>Status:</strong> Paid</p><hr><p>Generated from the member contribution history.</p><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}}>

<Download size={16}/>

Receipt

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

);

}

export default ContributionHistory;
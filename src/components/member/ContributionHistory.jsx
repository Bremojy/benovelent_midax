import {
  Download,
  CheckCircle,
} from "lucide-react";
import { openPrintDocument, escapePrintHtml } from "../../utils/printHead";

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
  const safeDate = new Date(item.date).toLocaleDateString();
  const safeAmount = Number(item.amount).toLocaleString();
  openPrintDocument({
    title: "Contribution Receipt",
    subtitle: "Official member contribution record.",
    bodyHtml: `<div class="print-card"><p><strong>Date:</strong> ${escapePrintHtml(safeDate)}</p><p><strong>Amount:</strong> KSh ${escapePrintHtml(safeAmount)}</p><p><strong>Status:</strong> Paid</p><p>Generated from the member contribution history.</p></div>`,
  });
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
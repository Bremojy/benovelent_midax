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

<button>

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
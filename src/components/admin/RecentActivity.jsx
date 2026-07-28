import {
  Bell,
  Wallet,
  HandHeart,
  Users,
  Newspaper,
  MessageCircle,
} from "lucide-react";

function RecentActivity({

    transactions=[],
    claims=[],
    members=[]

}){

const activities=[];

transactions.slice(0,3).forEach(transaction=>{

activities.push({

icon:<Wallet size={18}/>,

title:`${transaction.title}`,

subtitle:`KSh ${transaction.amount.toLocaleString()}`,

date:transaction.date

});

});

claims.slice(0,3).forEach(claim=>{

activities.push({

icon:<HandHeart size={18}/>,

title:`${claim.member}`,

subtitle:`${claim.status}`,

date:claim.date

});

});

members.slice(0,3).forEach(member=>{

activities.push({

icon:<Users size={18}/>,

title:`${member.fullName}`,

subtitle:"New Member",

date:member.joinDate

});

});

activities.sort(()=>Math.random()-0.5);

return(

<div className="activity-grid">

<div className="activity-card">

<h2>

Recent Activity

</h2>

{

activities.map((item,index)=>(

<div

key={index}

className="activity-item"

>

<div className="activity-icon">

{item.icon}

</div>

<div>

<strong>

{item.title}

</strong>

<p>

{item.subtitle}

</p>

<small>

{item.date}

</small>

</div>

</div>

))

}

</div>

<div className="notification-card">

<h2>

Notifications

</h2>

<div className="notification">

<Bell size={18}/>

<span>

3 New Claims Awaiting Approval

</span>

</div>

<div className="notification">

<Newspaper size={18}/>

<span>

Latest News Published

</span>

</div>

<div className="notification">

<MessageCircle size={18}/>

<span>

12 Unread Messages

</span>

</div>

</div>

</div>

);

}

export default RecentActivity;
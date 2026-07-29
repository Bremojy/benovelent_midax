import {
  Search,
} from "lucide-react";

import "./messages.css";

function ConversationList({

  conversations=[],

  selected,

  onSelect,

}){

return(

<div className="conversation-list">

<div className="conversation-search">

<Search size={18}/>

<input

placeholder="Search members..."

type="text"

/>

</div>

{

conversations.map(user=>(

<button

key={user._id}

className={

selected===user._id

?

"conversation active"

:

"conversation"

}

onClick={()=>onSelect(user)}

>

<div className="avatar">

{

user.fullName

.charAt(0)

}

</div>

<div className="conversation-info">

<h4>

{user.fullName}

</h4>

<p>

{user.lastMessage||

"No messages"}

</p>

</div>

{

user.unread>0 &&

<span className="message-badge">

{user.unread}

</span>

}

</button>

))

}

</div>

);

}

export default ConversationList;
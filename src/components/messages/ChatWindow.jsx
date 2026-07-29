import {

Send,

Paperclip,

Smile,

} from "lucide-react";

function ChatWindow({

selected,

messages=[],

}){

if(!selected){

return(

<div className="empty-chat">

Select a conversation

</div>

);

}

return(

<div className="chat-window">

<div className="chat-header">

<h3>

{selected.fullName}

</h3>

<span>

{

selected.online

?

"🟢 Online"

:

"Offline"

}

</span>

</div>

<div className="messages">

{

messages.map(msg=>(

<div

key={msg._id}

className={

msg.mine

?

"bubble mine"

:

"bubble"

}

>

{msg.text}

</div>

))

}

</div>

<div className="chat-input">

<button>

<Paperclip size={20}/>

</button>

<button>

<Smile size={20}/>

</button>

<input

placeholder="Write a message..."

/>

<button className="send-btn">

<Send size={20}/>

</button>

</div>

</div>

);

}

export default ChatWindow;
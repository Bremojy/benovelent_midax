import {

useState,

} from "react";

import DashboardLayout from "../../layouts/DashboardLayout";

import ConversationList from "../../components/messages/ConversationList";

import ChatWindow from "../../components/messages/ChatWindow";

import "./messages.css";

function Messages(){

const [

selected,

setSelected

]=useState(null);

const conversations=[];

const messages=[];

return(

<DashboardLayout>

<div className="messages-page">

<ConversationList

conversations={conversations}

selected={selected?._id}

onSelect={setSelected}

/>

<ChatWindow

selected={selected}

messages={messages}

/>

</div>

</DashboardLayout>

);

}

export default Messages;
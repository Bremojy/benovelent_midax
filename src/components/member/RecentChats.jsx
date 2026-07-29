import {
  Search,
  Circle,
  Send,
} from "lucide-react";

import "./RecentChats.css";

const chats = [

  {
    id: 1,
    name: "Treasurer",
    message: "Your July contribution has been received.",
    online: true,
    unread: 2,
    time: "2 min",
  },

  {
    id: 2,
    name: "Chairperson",
    message: "Meeting starts tomorrow at 2PM.",
    online: true,
    unread: 0,
    time: "1 hr",
  },

  {
    id: 3,
    name: "Secretary",
    message: "Documents have been uploaded.",
    online: false,
    unread: 4,
    time: "Yesterday",
  },

];

export default function RecentChats() {

  return (

    <div className="recent-chats">

      <div className="chat-header">

        <h2>Messages</h2>

        <Search size={18} />

      </div>

      <div className="chat-list">

        {chats.map(chat => (

          <div
            key={chat.id}
            className="chat-item"
          >

            <div className="chat-avatar">

              {chat.name.charAt(0)}

              {chat.online &&

              <Circle
                size={10}
                fill="#22c55e"
                color="#22c55e"
                className="online"
              />

              }

            </div>

            <div className="chat-content">

              <h4>{chat.name}</h4>

              <p>{chat.message}</p>

            </div>

            <div className="chat-right">

              <small>{chat.time}</small>

              {chat.unread > 0 &&

              <span className="chat-badge">

                {chat.unread}

              </span>

              }

            </div>

          </div>

        ))}

      </div>

      <button className="new-message-btn">

        <Send size={18}/>

        New Message

      </button>

    </div>

  );

}
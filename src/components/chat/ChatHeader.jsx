import {
    Phone,
    Video,
    Info,
    Circle,
} from "lucide-react";

import "./ChatHeader.css";

function ChatHeader({

    conversation,

    typingUser,

}) {

    if (!conversation) {

        return (

            <div className="chat-header empty">

                Select a conversation

            </div>

        );

    }

    const user = conversation.user || {};

    return (

        <div className="chat-header">

            <div className="chat-user">

                <div className="chat-avatar">

                    <img

                        src={

                            user.profileImage ||

                            "/default-avatar.png"

                        }

                        alt={user.fullName}

                    />

                    {

                        user.online && (

                            <span className="online-indicator">

                                <Circle

                                    size={10}

                                    fill="#22c55e"

                                    stroke="#22c55e"

                                />

                            </span>

                        )

                    }

                </div>

                <div className="chat-user-info">

                    <h3>

                        {user.fullName || "Member"}

                    </h3>

                    {

                        typingUser ? (

                            <p className="typing-status">

                                Typing...

                            </p>

                        ) : (

                            <p>

                                {

                                    user.online

                                    ?

                                    "Online"

                                    :

                                    "Offline"

                                }

                            </p>

                        )

                    }

                </div>

            </div>

            <div className="chat-actions">

                <button

                    title="Voice Call"

                >

                    <Phone size={20}/>

                </button>

                <button

                    title="Video Call"

                >

                    <Video size={20}/>

                </button>

                <button

                    title="Profile"

                >

                    <Info size={20}/>

                </button>

            </div>

        </div>

    );

}

export default ChatHeader;
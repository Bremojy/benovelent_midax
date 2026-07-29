import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./ChatPreview.css";

const API = import.meta.env.VITE_API_URL;

function ChatPreview() {

    const navigate = useNavigate();

    const [conversations, setConversations] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadConversations();

    }, []);

    async function loadConversations() {

        try {

            const token = localStorage.getItem("memberToken");

            const response = await fetch(

                `${API}/api/conversations`,

                {

                    headers: {

                        Authorization: `Bearer ${token}`,

                    },

                }

            );

            const data = await response.json();

            if (Array.isArray(data)) {

                setConversations(data);

            } else {

                setConversations(data.conversations || []);

            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    if (loading) {

        return (

            <div className="chat-preview">

                Loading conversations...

            </div>

        );

    }

    return (

        <div className="chat-preview">

            <div className="chat-preview-header">

                <div>

                    <MessageCircle size={26}/>

                    <h2>Recent Chats</h2>

                </div>

                <button

                    className="view-chat-btn"

                    onClick={() => navigate("/member/chat")}

                >

                    Open Chat

                </button>

            </div>

            {

                conversations.length === 0 && (

                    <div className="empty-chat">

                        No conversations yet.

                    </div>

                )

            }

            {

                conversations.slice(0,5).map((conversation)=>(

                    <div

                        key={conversation._id}

                        className="chat-item"

                        onClick={()=>

                            navigate(

                                `/member/chat/${conversation._id}`

                            )

                        }

                    >

                        <div className="chat-avatar">

                            <img

                                src={

                                    conversation.user?.profileImage ||

                                    "/default-avatar.png"

                                }

                                alt="avatar"

                            />

                            {

                                conversation.user?.online && (

                                    <span className="online-status"></span>

                                )

                            }

                        </div>

                        <div className="chat-info">

                            <h4>

                                {

                                    conversation.user?.fullName ||

                                    "Member"

                                }

                            </h4>

                            <p>

                                {

                                    conversation.lastMessage ||

                                    "Start chatting..."

                                }

                            </p>

                        </div>

                        <div className="chat-meta">

                            <small>

                                {

                                    conversation.updatedAt

                                    ?

                                    new Date(

                                        conversation.updatedAt

                                    ).toLocaleTimeString([],{

                                        hour:"2-digit",

                                        minute:"2-digit"

                                    })

                                    :

                                    ""

                                }

                            </small>

                            {

                                conversation.unreadCount > 0 && (

                                    <span className="chat-badge">

                                        {

                                            conversation.unreadCount

                                        }

                                    </span>

                                )

                            }

                        </div>

                    </div>

                ))

            }

        </div>

    );

}

export default ChatPreview;
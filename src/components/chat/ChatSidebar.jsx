import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import "./ChatSidebar.css";

const API = import.meta.env.VITE_API_URL;

function ChatSidebar({

    selectedConversation,

    onSelectConversation,

}) {

    const [conversations, setConversations] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadConversations();

    }, []);

    async function loadConversations() {

        try {

            const token =
                localStorage.getItem("memberToken");

            const response = await fetch(

                `${API}/api/conversations`,

                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                    },

                }

            );

            const data = await response.json();

            if (Array.isArray(data)) {

                setConversations(data);

            } else {

                setConversations(

                    data.conversations || []

                );

            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    const filtered = conversations.filter(

        (conversation) =>

            conversation.user?.fullName

                ?.toLowerCase()

                .includes(search.toLowerCase())

    );

    return (

        <div className="chat-sidebar">

            <div className="chat-sidebar-top">

                <h2>

                    Messages

                </h2>

                <div className="chat-search">

                    <Search size={18}/>

                    <input

                        type="text"

                        placeholder="Search members..."

                        value={search}

                        onChange={(e)=>

                            setSearch(

                                e.target.value

                            )

                        }

                    />

                </div>

            </div>

            {

                loading && (

                    <div className="chat-loading">

                        Loading...

                    </div>

                )

            }

            {

                !loading && filtered.length===0 && (

                    <div className="chat-empty">

                        No conversations

                    </div>

                )

            }

            <div className="conversation-list">

                {

                    filtered.map(

                        (conversation)=>(

                            <div

                                key={conversation._id}

                                className={

                                    selectedConversation?._id===conversation._id

                                    ?

                                    "conversation active"

                                    :

                                    "conversation"

                                }

                                onClick={()=>

                                    onSelectConversation(

                                        conversation

                                    )

                                }

                            >

                                <div className="avatar">

                                    <img

                                        src={

                                            conversation.user

                                            ?.profileImage ||

                                            "/default-avatar.png"

                                        }

                                        alt=""

                                    />

                                    {

                                        conversation.user

                                        ?.online && (

                                            <span className="online-dot"></span>

                                        )

                                    }

                                </div>

                                <div className="conversation-info">

                                    <h4>

                                        {

                                            conversation.user

                                            ?.fullName ||

                                            "Member"

                                        }

                                    </h4>

                                    <p>

                                        {

                                            conversation.lastMessage ||

                                            "No messages"

                                        }

                                    </p>

                                </div>

                                {

                                    conversation.unreadCount>0 && (

                                        <span className="badge">

                                            {

                                                conversation.unreadCount

                                            }

                                        </span>

                                    )

                                }

                            </div>

                        )

                    )

                }

            </div>

        </div>

    );

}

export default ChatSidebar;
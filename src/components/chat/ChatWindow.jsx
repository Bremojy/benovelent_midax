import {
    useEffect,
    useRef,
    useState,
} from "react";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

import "./ChatWindow.css";

const API = import.meta.env.VITE_API_URL;

function ChatWindow({

    conversation,
    socket,
    currentUser,

}) {

    const [messages, setMessages] =
        useState([]);

    const messagesEndRef =
        useRef(null);

    useEffect(() => {

        if (conversation) {

            loadMessages();

        }

    }, [conversation]);

    useEffect(() => {

        scrollToBottom();

    }, [messages]);

    useEffect(() => {

        if (!socket) return;

        socket.on(

            "receive_message",

            (message) => {

                if (

                    message.conversation ===

                    conversation?._id

                ) {

                    setMessages(

                        (previous) =>

                            [

                                ...previous,

                                message,

                            ]

                    );

                }

            }

        );

        return () => {

            socket.off(

                "receive_message"

            );

        };

    }, [

        socket,

        conversation,

    ]);

    async function loadMessages() {

        try {

            const token =
                localStorage.getItem(
                    "memberToken"
                );

            const response =
                await fetch(

                    `${API}/api/messages/${conversation._id}`,

                    {

                        headers: {

                            Authorization:

                                `Bearer ${token}`,

                        },

                    }

                );

            const data =
                await response.json();

            setMessages(

                Array.isArray(data)

                    ? data

                    : data.messages || []

            );

        } catch (error) {

            console.error(error);

        }

    }

    async function sendMessage(

        text,

        image = ""

    ) {

        if (

            !text.trim() &&

            !image

        )

            return;

        try {

            const token =
                localStorage.getItem(
                    "memberToken"
                );

            const response =
                await fetch(

                    `${API}/api/messages`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":

                                "application/json",

                            Authorization:

                                `Bearer ${token}`,

                        },

                        body: JSON.stringify({

                            conversationId:

                                conversation._id,

                            text,

                            image,

                        }),

                    }

                );

            const message =
                await response.json();

            setMessages(

                (previous) =>

                    [

                        ...previous,

                        message,

                    ]

            );

            socket?.emit(

                "send_message",

                message

            );

        } catch (error) {

            console.error(error);

        }

    }

    function scrollToBottom() {

        messagesEndRef.current

            ?.scrollIntoView({

                behavior: "smooth",

            });

    }

    if (!conversation) {

        return (

            <div className="chat-window-empty">

                Select a conversation

                to begin chatting.

            </div>

        );

    }

    return (

        <div className="chat-window">

            <div className="messages-container">

                {

                    messages.map(

                        (message) => (

                            <MessageBubble

                                key={

                                    message._id

                                }

                                message={

                                    message

                                }

                                own={

                                    message.sender ===

                                    currentUser?._id

                                }

                            />

                        )

                    )

                }

                <div

                    ref={

                        messagesEndRef

                    }

                />

            </div>

            <MessageInput

                onSend={

                    sendMessage

                }

                socket={socket}

                conversation={

                    conversation

                }

            />

        </div>

    );

}

export default ChatWindow;
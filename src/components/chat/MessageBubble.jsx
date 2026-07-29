import {
    Check,
    CheckCheck
} from "lucide-react";

import "./MessageBubble.css";

function MessageBubble({

    message,
    own,

}) {

    function formatTime(date) {

        return new Date(date).toLocaleTimeString(

            [],

            {

                hour: "2-digit",

                minute: "2-digit",

            }

        );

    }

    return (

        <div

            className={

                own

                    ? "message own"

                    : "message"

            }

        >

            <div className="message-content">

                {

                    message.image && (

                        <img

                            src={message.image}

                            alt=""

                            className="message-image"

                        />

                    )

                }

                {

                    message.text && (

                        <p>

                            {message.text}

                        </p>

                    )

                }

                <div className="message-footer">

                    <span>

                        {

                            formatTime(

                                message.createdAt

                            )

                        }

                    </span>

                    {

                        own && (

                            <span className="status">

                                {

                                    message.status ===

                                    "read"

                                    ?

                                    <CheckCheck

                                        size={15}

                                        color="#0ea5e9"

                                    />

                                    :

                                    message.status ===

                                    "delivered"

                                    ?

                                    <CheckCheck

                                        size={15}

                                    />

                                    :

                                    <Check

                                        size={15}

                                    />

                                }

                            </span>

                        )

                    }

                </div>

            </div>

        </div>

    );

}

export default MessageBubble;
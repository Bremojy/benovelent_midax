import "./ConversationItem.css";

function ConversationItem({

    conversation,

    active,

    onClick,

}) {

    const user = conversation.user || {};

    return (

        <div

            className={

                active

                    ? "conversation-item active"

                    : "conversation-item"

            }

            onClick={onClick}

        >

            <div className="conversation-avatar">

                <img

                    src={

                        user.profileImage ||

                        "/default-avatar.png"

                    }

                    alt={user.fullName}

                />

                {

                    user.online && (

                        <span className="online-dot"></span>

                    )

                }

            </div>

            <div className="conversation-body">

                <div className="conversation-top">

                    <h4>

                        {

                            user.fullName ||

                            "Member"

                        }

                    </h4>

                    <span>

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

                    </span>

                </div>

                <div className="conversation-bottom">

                    <p>

                        {

                            conversation.lastMessage ||

                            "Start chatting..."

                        }

                    </p>

                    {

                        conversation.unreadCount > 0 && (

                            <div className="conversation-badge">

                                {

                                    conversation.unreadCount

                                }

                            </div>

                        )

                    }

                </div>

            </div>

        </div>

    );

}

export default ConversationItem;
import "./TypingIndicator.css";

function TypingIndicator({

    visible,

    user,

}) {

    if (!visible) {

        return null;

    }

    return (

        <div className="typing-indicator">

            <div className="typing-avatar">

                <img

                    src={

                        user?.profileImage ||

                        "/default-avatar.png"

                    }

                    alt="typing"

                />

            </div>

            <div className="typing-bubble">

                <span></span>

                <span></span>

                <span></span>

            </div>

        </div>

    );

}

export default TypingIndicator;
import "./OnlineUsers.css";

function OnlineUsers({

    users = [],

    onSelectUser,

}) {

    return (

        <div className="online-users">

            <div className="online-users-header">

                <h3>

                    Online Members

                </h3>

                <span>

                    {users.length}

                </span>

            </div>

            {

                users.length === 0 ? (

                    <div className="no-online-users">

                        No members online

                    </div>

                ) : (

                    users.map((user) => (

                        <div

                            key={user._id}

                            className="online-user"

                            onClick={() =>

                                onSelectUser(user)

                            }

                        >

                            <div className="online-user-avatar">

                                <img

                                    src={

                                        user.profileImage ||

                                        "/default-avatar.png"

                                    }

                                    alt={user.fullName}

                                />

                                <span className="online-status"></span>

                            </div>

                            <div className="online-user-info">

                                <h4>

                                    {user.fullName}

                                </h4>

                                <p>

                                    Online

                                </p>

                            </div>

                        </div>

                    ))

                )

            }

        </div>

    );

}

export default OnlineUsers;
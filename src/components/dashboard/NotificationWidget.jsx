import { useEffect, useState } from "react";
import {
    Bell,
    CheckCircle,
    Clock,
} from "lucide-react";

import "./NotificationWidget.css";

const API = import.meta.env.VITE_API_URL;

function NotificationWidget() {

    const [notifications, setNotifications] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadNotifications();

    }, []);

    async function loadNotifications() {

        try {

            const token =
                localStorage.getItem("memberToken");

            const response = await fetch(

                `${API}/api/notifications`,

                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                    },

                }

            );

            const data = await response.json();

            if (Array.isArray(data)) {

                setNotifications(data);

            } else {

                setNotifications(
                    data.notifications || []
                );

            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    async function markAsRead(id) {

        try {

            const token =
                localStorage.getItem("memberToken");

            await fetch(

                `${API}/api/notifications/${id}/read`,

                {

                    method: "PATCH",

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                    },

                }

            );

            setNotifications((previous) =>

                previous.map((notification) =>

                    notification._id === id

                        ? {
                              ...notification,
                              isRead: true,
                          }

                        : notification

                )

            );

        } catch (error) {

            console.error(error);

        }

    }

    if (loading) {

        return (

            <div className="notification-widget">

                Loading notifications...

            </div>

        );

    }

    return (

        <div className="notification-widget">

            <div className="notification-header">

                <Bell size={28}/>

                <h2>

                    Notifications

                </h2>

            </div>

            {

                notifications.length === 0 && (

                    <div className="empty-notifications">

                        No notifications available.

                    </div>

                )

            }

            {

                notifications.slice(0,6).map(

                    (notification)=>(

                        <div

                            key={notification._id}

                            className={

                                notification.isRead

                                    ?

                                    "notification-item"

                                    :

                                    "notification-item unread"

                            }

                        >

                            <div>

                                <h4>

                                    {notification.title}

                                </h4>

                                <p>

                                    {notification.message}

                                </p>

                                <small>

                                    <Clock size={14}/>

                                    {" "}

                                    {

                                        new Date(

                                            notification.createdAt

                                        ).toLocaleString()

                                    }

                                </small>

                            </div>

                            {

                                !notification.isRead && (

                                    <button

                                        onClick={()=>

                                            markAsRead(

                                                notification._id

                                            )

                                        }

                                        className="read-btn"

                                    >

                                        <CheckCircle size={18}/>

                                    </button>

                                )

                            }

                        </div>

                    )

                )

            }

        </div>

    );

}

export default NotificationWidget;
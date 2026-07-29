import { useEffect, useState } from "react";
import { CalendarDays, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import "./RecentNews.css";

const API = import.meta.env.VITE_API_URL;

function RecentNews() {

    const [news, setNews] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadNews();

    }, []);

    async function loadNews() {

        try {

            const response = await fetch(
                `${API}/api/news`
            );

            const data = await response.json();

            if (Array.isArray(data)) {

                setNews(data);

            } else if (data.news) {

                setNews(data.news);

            }

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    if (loading) {

        return (

            <div className="recent-news">

                <h2>Latest News</h2>

                <p>Loading news...</p>

            </div>

        );

    }

    return (

        <div className="recent-news">

            <div className="news-header">

                <h2>

                    Latest News

                </h2>

                <Link
                    to="/news"
                    className="view-all"
                >

                    View All

                    <ArrowRight size={18}/>

                </Link>

            </div>

            {

                news.length === 0 && (

                    <div className="empty-news">

                        No announcements available.

                    </div>

                )

            }

            {

                news.slice(0,5).map(item=>(

                    <div

                        key={item._id}

                        className="news-item"

                    >

                        <div className="news-content">

                            <h3>

                                {item.title}

                            </h3>

                            <p>

                                {item.content?.substring(0,120)}...

                            </p>

                            <div className="news-meta">

                                <span>

                                    <User size={15}/>

                                    {item.author || "Admin"}

                                </span>

                                <span>

                                    <CalendarDays size={15}/>

                                    {

                                        new Date(

                                            item.createdAt

                                        ).toLocaleDateString()

                                    }

                                </span>

                            </div>

                        </div>

                    </div>

                ))

            }

        </div>

    );

}

export default RecentNews;
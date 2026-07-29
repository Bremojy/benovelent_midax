import { useEffect, useState } from "react";
import {
  Newspaper,
  Search,
  Calendar,
  ArrowRight,
} from "lucide-react";

import api, { UPLOAD_URL } from "../services/api";

import "./News.css";

function News() {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [featured, setFeatured] = useState(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  // ==========================================
  // FETCH NEWS
  // ==========================================

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get("/news");

      if (Array.isArray(response.data)) {
        setNews(response.data);
        setFilteredNews(response.data);

        if (response.data.length > 0) {
          setFeatured(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load news", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SEARCH
  // ==========================================

  useEffect(() => {
    if (!search.trim()) {
      setFilteredNews(news);
      return;
    }

    const keyword = search.toLowerCase();

    setFilteredNews(
      news.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          item.content.toLowerCase().includes(keyword)
      )
    );
  }, [search, news]);

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <section className="news-page">

        <div className="news-header">

          <h1>Latest News</h1>

          <p>Loading latest updates...</p>

        </div>

        <div className="news-grid">

          {[1,2,3,4,5,6].map((item)=>(

            <div
              key={item}
              className="news-card skeleton"
            />

          ))}

        </div>

      </section>
    );
  }

  return (
    <section className="news-page">

      {/* HERO */}

      <div className="news-header">

        <Newspaper
          size={60}
          className="news-icon"
        />

        <h1>News & Announcements</h1>

        <p>

          Stay informed with the latest updates,
          announcements and activities from
          Benevolent Midax.

        </p>

      </div>

      {/* FEATURED */}

      {featured && (

        <div className="featured-news">

          <img
            src={
              featured.imageUrl?.startsWith("http")
                ? featured.imageUrl
                : `${UPLOAD_URL}${featured.imageUrl}`
            }
            alt={featured.title}
          />

          <div className="featured-content">

            <span>

              Featured News

            </span>

            <h2>

              {featured.title}

            </h2>

            <p>

              {featured.content}

            </p>

            <div className="featured-date">

              <Calendar size={18} />

              {formatDate(
                featured.createdAt
              )}

            </div>

          </div>

        </div>

      )}

      {/* SEARCH */}

      <div className="news-search">

        <Search size={20} />

        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={(e)=>
            setSearch(e.target.value)
          }
        />

      </div>

      {/* EMPTY */}

      {filteredNews.length===0 && (

        <div className="empty-news">

          <h2>

            No news found

          </h2>

          <p>

            Try another search keyword.

          </p>

        </div>

      )}

      {/* NEWS GRID */}

      <div className="news-grid">

        {filteredNews.map((item)=>{

          const image =
            item.imageUrl?.startsWith("http")
              ? item.imageUrl
              : `${UPLOAD_URL}${item.imageUrl}`;

          return(

            <div
              className="news-card"
              key={item._id}
            >

              <div className="news-image">

                <img
                  src={image}
                  alt={item.title}
                  loading="lazy"
                />

              </div>

              <div className="news-content">

                <div className="news-date">

                  <Calendar size={16} />

                  {formatDate(
                    item.createdAt
                  )}

                </div>

                <h3>

                  {item.title}

                </h3>

                <p>

                  {item.content.length>160
                    ? item.content.substring(0,160)+"..."
                    : item.content}

                </p>

                <button
                  className="read-more-btn"
                >

                  Read More

                  <ArrowRight size={18}/>

                </button>

              </div>

            </div>

          );

        })}

      </div>

    </section>
  );
}

export default News;
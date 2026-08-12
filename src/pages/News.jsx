import { useEffect, useState } from "react";
import {
  Newspaper,
  Search,
  Calendar,
  ArrowRight,
  Vote,
  BarChart3,
} from "lucide-react";
import api, { UPLOAD_URL } from "../services/api";
import "./News.css";

const newsVideoSources = ["/videos/benevolent-news-loop.mp4", "/videos/benevolent-community-loop.mp4"];

function News() {
  const [news, setNews] = useState([]);
  const [polls, setPolls] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [videoFailed, setVideoFailed] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const [newsResponse, pollResponse] = await Promise.allSettled([
        api.get("/news/public"),
        api.get("/polls/public"),
      ]);

      if (newsResponse.status === "fulfilled") {
        const data = newsResponse.value.data;
        const items = Array.isArray(data?.news) ? data.news : [];
        setNews(items);
        setFilteredNews(items);
        setFeatured(
          items.find((item) => item.featured || item.pinned) || items[0] || null
        );
      }

      if (pollResponse.status === "fulfilled") {
        const data = pollResponse.value.data;
        setPolls(Array.isArray(data?.polls) ? data.polls : []);
      }
    } catch (error) {
      console.error("Failed to load public news", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setFilteredNews(news);
      return;
    }

    const keyword = search.toLowerCase();
    setFilteredNews(
      news.filter(
        (item) =>
          String(item.title || "").toLowerCase().includes(keyword) ||
          String(item.content || "").toLowerCase().includes(keyword) ||
          String(item.summary || "").toLowerCase().includes(keyword)
      )
    );
  }, [search, news]);

  const imageFor = (item) => {
    const image = item?.coverImage || item?.imageUrl || "";
    if (!image) return "/news-placeholder.svg";
    if (image.startsWith("http")) return image;
    return `${UPLOAD_URL}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Recent update";

  return (
    <main className="news-page">
      <section className={`news-video-hero ${videoFailed ? "video-failed" : ""}`}>
        {!videoFailed && (
          <video
            className="news-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero.jpg"
            onError={() => setVideoFailed(true)}
            aria-hidden="true"
          >
            {newsVideoSources.map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>
        )}
        <div className="news-video-overlay" />
        <div className="news-header">
          <Newspaper size={55} className="news-icon" />
          <span className="news-kicker">Benovelent MIDAX • NEWSROOM</span>
          <h1>Stories, Updates & Community Voice</h1>
          <p>
            Stay informed about support activities, announcements, community decisions and the people behind Benovelent Midax.
          </p>
        </div>
      </section>

      <div className="news-content-wrap">
        <div className="news-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search news, announcements and updates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="news-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="news-card skeleton" />
            ))}
          </div>
        ) : (
          <>
            {featured && (
              <article className="featured-news">
                <img
                  src={imageFor(featured)}
                  alt={featured.title}
                  onError={(e) => {
                    e.currentTarget.src = "/news-placeholder.svg";
                  }}
                />
                <div className="featured-content">
                  <span className="featured-tag">Featured update</span>
                  <h2>{featured.title}</h2>
                  <p>{featured.summary || featured.content}</p>
                  <div className="featured-date">
                    <Calendar size={17} /> {formatDate(featured.publishDate || featured.createdAt)}
                  </div>
                </div>
              </article>
            )}

            <div className="news-section-title">
              <div>
                <span>FROM THE NEWSROOM</span>
                <h2>Latest updates</h2>
              </div>
              <strong>{filteredNews.length}</strong>
            </div>

            {filteredNews.length === 0 ? (
              <div className="empty-news">
                <Newspaper size={38} />
                <h2>No published news yet</h2>
                <p>When an administrator publishes an update, it will appear here automatically.</p>
              </div>
            ) : (
              <div className="news-grid">
                {filteredNews.map((item) => (
                  <article className="news-card" key={item._id}>
                    <div className="news-image">
                      <img
                        src={imageFor(item)}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/news-placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="news-content">
                      <div className="news-date">
                        <Calendar size={15} /> {formatDate(item.publishDate || item.createdAt)}
                      </div>
                      <h3>{item.title}</h3>
                      <p>
                        {(item.summary || item.content || "").slice(0, 170)}
                        {(item.summary || item.content || "").length > 170 ? "..." : ""}
                      </p>
                      <button className="read-more-btn" type="button" onClick={() => setSelectedNews(item)}>
                        Read More <ArrowRight size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <section className="public-polls-section">
          <div className="news-section-title">
            <div>
              <span>MEMBER VOICE</span>
              <h2>Live community polls</h2>
            </div>
            <Vote size={25} />
          </div>

          {polls.length === 0 ? (
            <div className="empty-news compact">
              <Vote size={32} />
              <p>No active community poll right now.</p>
            </div>
          ) : (
            <div className="public-poll-grid">
              {polls.map((poll) => (
                <article className="public-poll-card" key={poll._id}>
                  <div className="public-poll-title">
                    <BarChart3 size={22} />
                    <div>
                      <span>LIVE POLL</span>
                      <h3>{poll.title}</h3>
                    </div>
                  </div>
                  <p>{poll.description}</p>
                  <div className="public-poll-options">
                    {(poll.options || []).map((option) => {
                      const percent = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                      return (
                        <div className="public-poll-option" key={option._id}>
                          <div>
                            <span>{option.text}</span>
                            <b>{percent}%</b>
                          </div>
                          <i><em style={{ width: `${percent}%` }} /></i>
                        </div>
                      );
                    })}
                  </div>
                  <small>{poll.totalVotes || 0} votes • Members vote inside the secure portal</small>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedNews && (
          <div className="news-modal-backdrop" onClick={() => setSelectedNews(null)}>
            <div className="news-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="news-modal-close" onClick={() => setSelectedNews(null)}>×</button>
              <img src={imageFor(selectedNews)} alt={selectedNews.title} onError={(e) => { e.currentTarget.src = "/news-placeholder.svg"; }} />
              <span className="featured-tag">Full update</span>
              <h2>{selectedNews.title}</h2>
              <p>{selectedNews.content}</p>
              {Array.isArray(selectedNews.attachments) && selectedNews.attachments.length > 0 && (
                <div className="news-attachments">
                  <strong>Attachments</strong>
                  {selectedNews.attachments.map((attachment, index) => {
                    const url = typeof attachment === "string" ? attachment : attachment?.fileUrl || attachment?.url;
                    if (!url) return null;
                    const fullUrl = url.startsWith("http") ? url : `${UPLOAD_URL}${url.startsWith("/") ? "" : "/"}${url}`;
                    return (
                      <a href={fullUrl} target="_blank" rel="noreferrer" key={`${fullUrl}-${index}`}>
                        Open attachment {index + 1}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default News;

import { useEffect, useState } from "react";
import { BadgeCheck, Pin, Newspaper } from "lucide-react";
import API from "../../services/api";
import "./CommunityFeed.css";

export default function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { API.get("/news/public").then(({ data }) => setPosts(Array.isArray(data?.news) ? data.news.slice(0, 5) : [])).catch(() => setPosts([])); }, []);
  return <section className="community-feed"><div className="feed-title"><div><h2>Community Feed</h2><p>Latest published updates from Benovelent Midax</p></div></div>{posts.length === 0 ? <div className="portal-empty">No published updates yet.</div> : posts.map((post) => <article key={post._id} className="feed-card"><div className="feed-top"><div className="feed-user"><div className="feed-avatar">{String(post.author?.fullName || "N").charAt(0)}</div><div><h3>{post.author?.fullName || "Newsroom"}<BadgeCheck size={17} className="verified" /></h3><span>{post.publishDate || post.createdAt ? new Date(post.publishDate || post.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</span></div></div><div className="feed-right">{post.pinned && <Pin size={18} className="pin" />}<Newspaper size={20} /></div></div><h3 className="feed-content">{post.title}</h3><p className="feed-content">{post.summary || post.content}</p></article>)}</section>;
}

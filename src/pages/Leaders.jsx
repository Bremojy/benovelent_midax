
import { useEffect, useMemo, useState } from "react";
import { Users, Search, BadgeCheck, Sparkles, ArrowRight } from "lucide-react";
import api, { UPLOAD_URL } from "../services/api";
import "./Leaders.css";

function Leaders() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchLeaders(); }, []);

  const fetchLeaders = async () => {
    try {
      const response = await api.get("/leaders/active");
      setLeaders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load leaders", error);
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return leaders;
    return leaders.filter((leader) => `${leader.name || ""} ${leader.position || ""} ${leader.bio || ""}`.toLowerCase().includes(keyword));
  }, [search, leaders]);

  const secretaryVacant = !leaders.some((leader) => /secretary/i.test(String(leader.position || "")));

  if (loading) {
    return (
      <section className="leaders-page">
        <div className="leaders-header">
          <h1>Our Leadership</h1>
          <p>Loading leadership team...</p>
        </div>
        <div className="leaders-grid">
          {[1, 2, 3, 4].map((item) => <div className="leader-card skeleton" key={item} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="leaders-page">
      <div className="leaders-header">
        <Users size={60} className="leaders-icon" />
        <span className="leaders-eyebrow"><Sparkles size={14} /> FAMILY PLATFORM LEADERS</span>
        <h1>Meet Our Leadership</h1>
        <p>Dedicated leaders committed to transparency, integrity and serving every member of Benevolent Midax.</p>
      </div>

      <div className="leaders-search">
        <Search size={20} />
        <input type="text" placeholder="Search leader..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {secretaryVacant && (
        <div className="leaders-vacancy-banner">
          <strong>Secretary seat coming soon</strong>
          <span>It is open for all members who are ready to serve.</span>
          <a href="/contact">Apply or ask a question <ArrowRight size={16} /></a>
        </div>
      )}

      {filteredLeaders.length === 0 && (
        <div className="empty-state">
          <h2>No leaders found</h2>
          <p>Try another search.</p>
        </div>
      )}

      <div className="leaders-grid">
        {filteredLeaders.map((leader) => {
          const image = leader.imageUrl ? (leader.imageUrl.startsWith("http") ? leader.imageUrl : `${UPLOAD_URL}${leader.imageUrl}`) : "/default-avatar.svg";
          return (
            <div className="leader-card" key={leader._id}>
              <div className="leader-image"><img src={image} alt={leader.name} loading="lazy" /></div>
              <div className="leader-content">
                <span className="leader-position"><BadgeCheck size={16} /> {leader.position}</span>
                <h2>{leader.name}</h2>
                {leader.bio && <p>{leader.bio}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Leaders;

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  BadgeCheck,
} from "lucide-react";

import api, { UPLOAD_URL } from "../services/api";

import "./Leaders.css";

function Leaders() {
  const [leaders, setLeaders] = useState([]);
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ===========================================
  // FETCH LEADERS
  // ===========================================

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    try {
      const response = await api.get("/leaders/active");

      if (Array.isArray(response.data)) {
        setLeaders(response.data);
        setFilteredLeaders(response.data);
      }
    } catch (error) {
      console.error("Failed to load leaders", error);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // SEARCH
  // ===========================================

  useEffect(() => {
    if (!search.trim()) {
      setFilteredLeaders(leaders);
      return;
    }

    const keyword = search.toLowerCase();

    setFilteredLeaders(
      leaders.filter(
        (leader) =>
          leader.name.toLowerCase().includes(keyword) ||
          leader.position.toLowerCase().includes(keyword)
      )
    );
  }, [search, leaders]);

  // ===========================================
  // LOADING
  // ===========================================

  if (loading) {
    return (
      <section className="leaders-page">
        <div className="leaders-header">
          <h1>Our Leadership</h1>
          <p>Loading leadership team...</p>
        </div>

        <div className="leaders-grid">
          {[1, 2, 3, 4].map((item) => (
            <div
              className="leader-card skeleton"
              key={item}
            ></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="leaders-page">

      {/* HERO */}

      <div className="leaders-header">

        <Users
          size={60}
          className="leaders-icon"
        />

        <h1>
          Meet Our Leadership
        </h1>

        <p>
          Dedicated leaders committed to
          transparency, integrity and serving every
          member of Benevolent Midax.
        </p>

      </div>

      {/* SEARCH */}

      <div className="leaders-search">

        <Search size={20} />

        <input
          type="text"
          placeholder="Search leader..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      {/* EMPTY */}

      {filteredLeaders.length === 0 && (
        <div className="empty-state">

          <h2>
            No leaders found
          </h2>

          <p>
            Try another search.
          </p>

        </div>
      )}

      {/* GRID */}

      <div className="leaders-grid">

        {filteredLeaders.map((leader) => {

          const image =
            leader.imageUrl?.startsWith("http")
              ? leader.imageUrl
              : `${UPLOAD_URL}${leader.imageUrl}`;

          return (

            <div
              className="leader-card"
              key={leader._id}
            >

              <div className="leader-image">

                <img
                  src={image}
                  alt={leader.name}
                  loading="lazy"
                />

              </div>

              <div className="leader-content">

                <span className="leader-position">

                  <BadgeCheck size={16} />

                  {leader.position}

                </span>

                <h2>

                  {leader.name}

                </h2>

                {leader.bio && (
                  <p>

                    {leader.bio}

                  </p>
                )}

              </div>

            </div>

          );
        })}

      </div>

    </section>
  );
}

export default Leaders;
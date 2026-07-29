import {
  Heart,
  MessageCircle,
  Share2,
  Pin,
  BadgeCheck,
  MoreHorizontal,
} from "lucide-react";

import "./CommunityFeed.css";

const posts = [
  {
    id: 1,
    author: "Chairperson",
    verified: true,
    pinned: true,
    time: "1 hour ago",
    content:
      "Monthly meeting will be held this Saturday at 2:00 PM. Kindly keep time.",
    image: "",
    likes: 42,
    comments: 18,
  },

  {
    id: 2,
    author: "Treasurer",
    verified: true,
    pinned: false,
    time: "Today",
    content:
      "Thank you everyone! July contributions reached 98% collection. Your commitment keeps our community strong.",
    image: "",
    likes: 63,
    comments: 11,
  },

  {
    id: 3,
    author: "Secretary",
    verified: true,
    pinned: false,
    time: "Yesterday",
    content:
      "Photos from the Community Outreach Program have been uploaded. Thank you to everyone who participated.",
    image: "https://picsum.photos/900/450",
    likes: 84,
    comments: 29,
  },
];

export default function CommunityFeed() {
  return (
    <section className="community-feed">

      <div className="feed-title">

        <div>

          <h2>Community Feed</h2>

          <p>Latest updates from Benevolent Midax</p>

        </div>

      </div>

      {posts.map((post) => (

        <article
          key={post.id}
          className="feed-card"
        >

          <div className="feed-top">

            <div className="feed-user">

              <div className="feed-avatar">

                {post.author.charAt(0)}

              </div>

              <div>

                <h3>

                  {post.author}

                  {post.verified && (
                    <BadgeCheck
                      size={17}
                      className="verified"
                    />
                  )}

                </h3>

                <span>{post.time}</span>

              </div>

            </div>

            <div className="feed-right">

              {post.pinned && (
                <Pin
                  size={18}
                  className="pin"
                />
              )}

              <MoreHorizontal size={20} />

            </div>

          </div>

          <p className="feed-content">

            {post.content}

          </p>

          {post.image && (
            <img
              src={post.image}
              alt=""
              className="feed-image"
            />
          )}

          <div className="feed-actions">

            <button>

              <Heart size={18} />

              <span>{post.likes}</span>

            </button>

            <button>

              <MessageCircle size={18} />

              <span>{post.comments}</span>

            </button>

            <button>

              <Share2 size={18} />

              <span>Share</span>

            </button>

          </div>

        </article>

      ))}

    </section>
  );
}
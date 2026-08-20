import {
  Wallet,
  HandHeart,
  CalendarClock,
  MessageCircle,
} from "lucide-react";

import "../../styles/member.css";

function MemberStats({
  standardMonthlyDeduction = 500,
  schemeCollected = 0,
  activeClaims = 2,
  unreadMessages = 4,
}) {
  const cards = [
    {
      title: "Scheme Collected",
      value: `KSh ${Number(schemeCollected).toLocaleString()}`,
      icon: Wallet,
    },
    {
      title: "Active Claims",
      value: activeClaims,
      icon: HandHeart,
    },
    {
      title: "Standard Deduction",
      value: `KSh ${Number(standardMonthlyDeduction).toLocaleString()}`,
      icon: CalendarClock,
    },
    {
      title: "Unread Messages",
      value: unreadMessages,
      icon: MessageCircle,
    },
  ];

  return (
    <div className="member-stats">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="member-stat-card"
          >
            <div className="member-stat-icon">
              <Icon size={26} />
            </div>

            <div className="member-stat-info">
              <h4>{card.title}</h4>
              <h2>{card.value}</h2>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MemberStats;
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  HandHeart,
  MessageCircle,
  FileText,
} from "lucide-react";

import "../../styles/member.css";

function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Make Contribution",
      icon: CreditCard,
      color: "#ff7a00",
      path: "/member/contributions",
    },
    {
      title: "Submit Claim",
      icon: HandHeart,
      color: "#0ea5e9",
      path: "/member/claims",
    },
    {
      title: "Contact Admin",
      icon: MessageCircle,
      color: "#10b981",
      path: "/member/messages",
    },
    {
      title: "View Accounts & Ledger",
      icon: FileText,
      color: "#8b5cf6",
      path: "/member/accounts",
    },
  ];

  return (
    <div className="quick-actions-card">
      <h3>Quick Actions</h3>

      <div className="quick-actions-grid">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              className="quick-action-btn"
              onClick={() => navigate(action.path)}
            >
              <div
                className="quick-icon"
                style={{
                  background: `${action.color}20`,
                  color: action.color,
                }}
              >
                <Icon size={28} />
              </div>

              <span>{action.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
import { LayoutDashboard, Users, Wallet, HandHeart, MessageCircle, UserRound, UserPlus, ShieldCheck, ClipboardList, Headphones, Vote, MessageSquarePlus } from "lucide-react";

export const dashboardMenus = {
  member: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/member" },
    { title: "Profile", icon: UserRound, path: "/member/profile" },
    { title: "Dependents", icon: Users, path: "/member/dependents" },
    { title: "Accounts", icon: Wallet, path: "/member/accounts" },
    { title: "Support", icon: Headphones, path: "/member/support" },
    { title: "Claim", icon: HandHeart, path: "/member/claims" },
    { title: "Chat", icon: MessageCircle, path: "/member/messages" },
    { title: "Polls", icon: Vote, path: "/member/polls" },
    { title: "Feedback", icon: MessageSquarePlus, path: "/member/feedback" },
  ],
  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { title: "Members", icon: Users, path: "/admin/members" },
    { title: "Accounts", icon: Wallet, path: "/admin/accounts" },
    { title: "Claims", icon: HandHeart, path: "/admin/claims" },
    { title: "Support", icon: Headphones, path: "/admin/support" },
    { title: "Chat", icon: MessageCircle, path: "/admin/messages" },
    { title: "Polls", icon: Vote, path: "/admin/polls" },
    { title: "Feedback", icon: MessageSquarePlus, path: "/admin/feedback" },
  ],
  superadmin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/superadmin" },
    { title: "Administrators", icon: UserPlus, path: "/superadmin/admins" },
    { title: "Members", icon: Users, path: "/superadmin/members" },
    { title: "Accounts", icon: Wallet, path: "/superadmin/accounts" },
    { title: "Audit", icon: ClipboardList, path: "/superadmin/audit" },
    { title: "Data Integrity", icon: ShieldCheck, path: "/superadmin/data-integrity" },
    { title: "System", icon: ShieldCheck, path: "/superadmin/system" },
    { title: "Constitution", icon: ClipboardList, path: "/superadmin/constitution" },
    { title: "Claims", icon: HandHeart, path: "/superadmin/claims" },
    { title: "Settings", icon: ShieldCheck, path: "/superadmin/settings" },
    { title: "Polls", icon: Vote, path: "/superadmin/polls" },
    { title: "Feedback", icon: MessageSquarePlus, path: "/superadmin/feedback" },
  ],
};

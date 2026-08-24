import { LayoutDashboard, Users, Wallet, HandHeart, MessageCircle, UserRound, UserPlus, ClipboardList, ShieldCheck, DatabaseZap, Landmark } from "lucide-react";

export const dashboardMenus = {
  member: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/member" },
    { title: "Profile", icon: UserRound, path: "/member/profile" },
    { title: "Dependents", icon: Users, path: "/member/dependents" },
    { title: "Accounts", icon: Wallet, path: "/member/accounts" },
    { title: "Support", icon: HandHeart, path: "/member/support" },
    { title: "Claims & Community Support", icon: HandHeart, path: "/member/claims" },
    { title: "Chat", icon: MessageCircle, path: "/member/messages" },
  ],
  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { title: "Members", icon: Users, path: "/admin/members" },
    { title: "Accounts", icon: Wallet, path: "/admin/accounts" },
    { title: "Claims", icon: HandHeart, path: "/admin/claims" },
    { title: "Support", icon: HandHeart, path: "/admin/support" },
    { title: "Chat", icon: MessageCircle, path: "/admin/messages" },
  ],
  superadmin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/superadmin" },
    { title: "Administrators", icon: UserPlus, path: "/superadmin/admins" },
    { title: "Members", icon: Users, path: "/superadmin/members" },
    { title: "Accounts", icon: Wallet, path: "/superadmin/accounts" },
    { title: "Audit", icon: ClipboardList, path: "/superadmin/audit" },
    { title: "Data Integrity", icon: DatabaseZap, path: "/superadmin/data-integrity" },
    { title: "System", icon: ShieldCheck, path: "/superadmin/system" },
    { title: "Constitution", icon: Landmark, path: "/superadmin/constitution" },
    { title: "Claims", icon: HandHeart, path: "/superadmin/claims" },
    { title: "Support", icon: HandHeart, path: "/superadmin/support" },
    { title: "Chat", icon: MessageCircle, path: "/superadmin/messages" },
  ],
};

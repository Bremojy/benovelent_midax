import { LayoutDashboard, UserRound, Wallet, HandHeart, MessageCircle, Users, Landmark, BarChart3, ShieldCheck, Settings, Newspaper, DatabaseZap } from "lucide-react";

export const dashboardMenus = {
  member: [
    { section: "Overview", title: "Dashboard", icon: LayoutDashboard, path: "/member" },
    { section: "Account", title: "My Account", icon: UserRound, path: "/member/account", childPaths: ["/member/profile", "/member/dependents", "/member/account"] },
    { section: "Finance", title: "Money & Contributions", icon: Wallet, path: "/member/money", childPaths: ["/member/accounts", "/member/contributions", "/member/mpesa-records", "/member/money"] },
    { section: "Support", title: "Support & Claims", icon: HandHeart, path: "/member/support-center", childPaths: ["/member/support", "/member/claims", "/member/benefits", "/member/support-center"] },
    { section: "Community", title: "Community", icon: MessageCircle, path: "/member/community", childPaths: ["/member/messages", "/member/announcements", "/member/notifications", "/member/polls", "/member/feedback", "/member/community"] },
    { section: "Help", title: "Help & Guide", icon: MessageCircle, path: "/member/help", childPaths: ["/member/guide", "/member/help"] },
    { section: "Settings", title: "Settings", icon: Settings, path: "/member/settings" },
  ],
  admin: [
    { section: "Overview", title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { section: "Operations", title: "People & Operations", icon: Users, path: "/admin/operations", childPaths: ["/admin/members", "/admin/support", "/admin/claims", "/admin/operations"] },
    { section: "Finance", title: "Finance", icon: Wallet, path: "/admin/finance-center", childPaths: ["/admin/accounts", "/admin/finance", "/admin/finance-center"] },
    { section: "Communications", title: "Communications", icon: MessageCircle, path: "/admin/communications", childPaths: ["/admin/messages", "/admin/notifications", "/admin/announcements", "/admin/polls", "/admin/feedback", "/admin/communications"] },
    { section: "Content", title: "Website & Communications", icon: Newspaper, path: "/admin/website", childPaths: ["/admin/website", "/admin/announcements"] },
    { section: "Reports", title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { section: "Leadership", title: "Leadership & Constitution", icon: Landmark, path: "/admin/leadership", childPaths: ["/admin/leadership"] },
    { section: "Settings", title: "Profile & Settings", icon: UserRound, path: "/admin/settings" },
  ],
  superadmin: [
    { section: "Overview", title: "Dashboard", icon: LayoutDashboard, path: "/superadmin" },
    { section: "People", title: "People & Access", icon: Users, path: "/superadmin/people", childPaths: ["/superadmin/admins", "/superadmin/members", "/superadmin/leaders", "/superadmin/people"] },
    { section: "Governance", title: "Governance", icon: Landmark, path: "/superadmin/governance", childPaths: ["/superadmin/constitution", "/superadmin/policies", "/superadmin/audit", "/superadmin/governance"] },
    { section: "Finance", title: "Finance & Assistance", icon: Wallet, path: "/superadmin/finance-center", childPaths: ["/superadmin/accounts", "/superadmin/claims", "/superadmin/support", "/superadmin/finance-center"] },
    { section: "Communications", title: "Website & Communications", icon: Newspaper, path: "/superadmin/communications", childPaths: ["/superadmin/news", "/superadmin/leaders", "/superadmin/policies", "/superadmin/communications"] },
    { section: "Reports", title: "Reports & Records", icon: BarChart3, path: "/superadmin/reports" },
    { section: "System", title: "System & Diagnostics", icon: ShieldCheck, path: "/superadmin/system-center", childPaths: ["/superadmin/data-integrity", "/superadmin/system", "/superadmin/notifications", "/superadmin/system-center"] },
    { section: "Settings", title: "Settings", icon: Settings, path: "/superadmin/settings-center", childPaths: ["/superadmin/settings", "/superadmin/password", "/superadmin/settings-center"] },
  ],
};

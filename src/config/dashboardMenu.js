import {
  LayoutDashboard,
  Users,
  Wallet,
  HandHeart,
  Bell,
  MessageCircle,
  UserRound,
  UserPlus,
  ShieldCheck,
  Settings,
  ClipboardList,
  Headphones,
} from "lucide-react";

export const dashboardMenus = {
  member: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/member" },
    { title: "Profile", icon: UserRound, path: "/member/profile" },
    { title: "Finance & Contributions", icon: Wallet, path: "/member/contributions" },
    { title: "Claims", icon: HandHeart, path: "/member/claims" },
    { title: "Support Centre", icon: Headphones, path: "/member/support" },
    { title: "Dependents", icon: Users, path: "/member/dependents" },
    { title: "Notifications", icon: Bell, path: "/member/notifications" },
    { title: "Messages", icon: MessageCircle, path: "/member/messages" },
  ],

  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { title: "Members", icon: Users, path: "/admin/members" },
    { title: "Finance", icon: Wallet, path: "/admin/finance" },
    { title: "Claims", icon: HandHeart, path: "/admin/claims" },
    { title: "Support", icon: Headphones, path: "/admin/support" },
  ],

  superadmin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/superadmin" },
    { title: "Administrators", icon: UserPlus, path: "/superadmin/admins" },
    { title: "Members", icon: Users, path: "/superadmin/members" },
    { title: "Finance", icon: Wallet, path: "/superadmin/finance" },
    { title: "Audit", icon: ClipboardList, path: "/superadmin/audit" },
    { title: "Settings", icon: Settings, path: "/superadmin/settings" },
    { title: "System", icon: ShieldCheck, path: "/superadmin/system" },
  ],
};

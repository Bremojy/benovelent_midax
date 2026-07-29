import {
  LayoutDashboard,
  Users,
  Wallet,
  HandHeart,
  Bell,
  MessageCircle,
  FileText,
  UserCog,
  Settings,
  ShieldCheck
} from "lucide-react";

export const dashboardMenus = {

  member: [

    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/member",
    },

    {
  title: "Settings",
  icon: Settings,
  path: "/member/settings",
},

    {
  title: "Notifications",
  icon: Bell,
  path: "/member/notifications",
},

    {
      title: "My Contributions",
      icon: Wallet,
      path: "/member/contributions",
    },

    {
      title: "Claims",
      icon: HandHeart,
      path: "/member/claims",
    },

    {
      title: "Announcements",
      icon: Bell,
      path: "/member/announcements",
    },

    {
      title: "Messages",
      icon: MessageCircle,
      path: "/member/messages",
    },

    {
      title: "Profile",
      icon: Users,
      path: "/member/profile",
    }

  ],

  admin: [

    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin",
    },

    {
      title: "Members",
      icon: Users,
      path: "/admin/members",
    },

    {
      title: "Claims",
      icon: HandHeart,
      path: "/admin/claims",
    },

    {
      title: "Contributions",
      icon: Wallet,
      path: "/admin/contributions",
    },

    {
      title: "Announcements",
      icon: Bell,
      path: "/admin/announcements",
    },

    {
      title: "Messages",
      icon: MessageCircle,
      path: "/admin/messages",
    },

    {
      title: "Reports",
      icon: FileText,
      path: "/admin/reports",
    }

  ],

  superadmin: [

    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/superadmin",
    },

    {
      title: "Admins",
      icon: UserCog,
      path: "/superadmin/admins",
    },

    {
      title: "Members",
      icon: Users,
      path: "/superadmin/members",
    },

    {
      title: "Finance",
      icon: Wallet,
      path: "/superadmin/finance",
    },

    {
      title: "Reports",
      icon: FileText,
      path: "/superadmin/reports",
    },

    {
      title: "Settings",
      icon: Settings,
      path: "/superadmin/settings",
    },

    {
      title: "System",
      icon: ShieldCheck,
      path: "/superadmin/system",
    }

  ]

};
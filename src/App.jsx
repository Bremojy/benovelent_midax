import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  lazy,
  Suspense,
} from "react";

import ScrollToTop from "./components/ScrollToTop";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import "./App.css";

// ========================================
// PUBLIC PAGES
// ========================================

const Home = lazy(
  () => import("./pages/Home")
);

const About = lazy(
  () => import("./pages/About")
);

const Services = lazy(
  () => import("./pages/Services")
);

const Leaders = lazy(
  () => import("./pages/Leaders")
);

const Members = lazy(
  () => import("./pages/Members")
);

const News = lazy(
  () => import("./pages/News")
);

const Contact = lazy(
  () => import("./pages/Contact")
);

const Login = lazy(
  () => import("./pages/Login")
);

// ========================================
// ADMIN PAGES
// ========================================

const AdminDashboard = lazy(
  () =>
    import(
      "./pages/admin/AdminDashboard"
    )
);

const AdminMembers = lazy(
  () =>
    import(
      "./pages/admin/AdminMembers"
    )
);

// ========================================
// MEMBER PAGES
// ========================================

const MemberDashboard = lazy(
  () =>
    import(
      "./pages/member/MemberDashboard"
    )
);

const Notifications = lazy(
  () =>
    import(
      "./pages/member/Notifications"
    )
);

const Messages = lazy(
  () =>
    import(
      "./pages/member/Messages"
    )
);

const Profile = lazy(
  () =>
    import(
      "./pages/member/Profile"
    )
);

const Contributions = lazy(
  () =>
    import(
      "./pages/member/Contributions"
    )
);

const Claims = lazy(
  () =>
    import(
      "./pages/member/Claims"
    )
);

const Announcements = lazy(
  () =>
    import(
      "./pages/member/Announcements"
    )
);

const Support = lazy(
  () =>
    import(
      "./pages/member/Support"
    )
);

const Benefits = lazy(
  () =>
    import(
      "./pages/member/Benefits"
    )
);

const Settings = lazy(
  () =>
    import(
      "./pages/member/Settings"
    )
);

// ========================================
// SUPERADMIN PAGES
// ========================================

const SuperAdminDashboard = lazy(
  () =>
    import(
      "./pages/superadmin/SuperAdminDashboard"
    )
);

// ========================================
// LOADING SCREEN
// ========================================

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8f9fa",
        color: "#ff7a00",
        fontSize: "22px",
        fontWeight: "700",
      }}
    >
      Loading...
    </div>
  );
}

// ========================================
// PUBLIC NAVBAR
// ========================================

function PublicNavbar() {
  const location = useLocation();

  const dashboardRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member") ||
    location.pathname.startsWith("/superadmin");

  const isLogin =
    location.pathname === "/login";

  if (dashboardRoute || isLogin) {
    return null;
  }

  return <Navbar />;
}

// ========================================
// APP CONTENT
// ========================================

function AppContent() {
  const location = useLocation();

  const dashboardRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member") ||
    location.pathname.startsWith("/superadmin");

  const isLogin =
    location.pathname === "/login";

  const hideFooter =
    dashboardRoute || isLogin;

  return (
    <>
      <PublicNavbar />

      <Suspense
        fallback={<LoadingScreen />}
      >
        <Routes>

          {/* ==================================
              PUBLIC ROUTES
          ================================== */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/services"
            element={<Services />}
          />

          <Route
            path="/leaders"
            element={<Leaders />}
          />

          <Route
            path="/members"
            element={<Members />}
          />

          <Route
            path="/news"
            element={<News />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          {/* ==================================
              LOGIN
          ================================== */}

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          {/* ==================================
              ADMIN PORTAL
          ================================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/members"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "superadmin",
                ]}
              >
                <AdminMembers />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              MEMBER PORTAL
          ================================== */}

          <Route
            path="/member"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/profile"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/contributions"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Contributions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/claims"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Claims />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/announcements"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Announcements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/messages"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/notifications"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/settings"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/support"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Support />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/benefits"
            element={
              <ProtectedRoute
                allowedRoles={["member"]}
              >
                <Benefits />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              SUPERADMIN PORTAL
          ================================== */}

          <Route
            path="/superadmin"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "superadmin",
                ]}
              >
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ==================================
              UNKNOWN ROUTE
          ================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </Suspense>

      {!hideFooter && <Footer />}
    </>
  );
}

// ========================================
// ROOT APP
// ========================================

function App() {
  return (
    <BrowserRouter>

      <ScrollToTop />

      <AppContent />

    </BrowserRouter>
  );
}

export default App;
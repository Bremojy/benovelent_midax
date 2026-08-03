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
import ThemeBootstrap from "./components/ThemeBootstrap";

import "./App.css";

// =====================================================
// PUBLIC PAGES
// =====================================================

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

const Constitution = lazy(
  () => import("./pages/Constitution")
);

const Gallery = lazy(
  () => import("./pages/Gallery")
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

const PortalSettings = lazy(
  () => import("./pages/PortalSettings")
);

const Polls = lazy(() => import("./pages/Polls"));


// =====================================================
// ADMIN PAGES
// =====================================================

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

const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminClaims = lazy(() => import("./pages/admin/AdminClaims"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));


// =====================================================
// MEMBER PAGES
// =====================================================

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
const Dependents = lazy(() => import("./pages/member/Dependents"));

const Settings = lazy(
  () =>
    import(
      "./pages/member/Settings"
    )
);


// =====================================================
// SUPERADMIN PAGES
// =====================================================

const SuperAdminDashboard = lazy(
  () =>
    import(
      "./pages/superadmin/SuperAdminDashboard"
    )
);

const SuperAdminAdmins = lazy(
  () =>
    import(
      "./pages/superadmin/SuperAdminAdmins"
    )
);
const SuperAdminAudit = lazy(() => import("./pages/superadmin/SuperAdminAudit"));
const SuperAdminSettings = lazy(() => import("./pages/superadmin/SuperAdminSettings"));
const SuperAdminSystem = lazy(() => import("./pages/superadmin/SuperAdminSystem"));


// =====================================================
// LOADING SCREEN
// =====================================================

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


// =====================================================
// PUBLIC NAVBAR
// =====================================================

function PublicNavbar() {
  const location = useLocation();

  const dashboardRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member") ||
    location.pathname.startsWith("/superadmin");

  const isLogin =
    location.pathname === "/login";

  if (dashboardRoute) {
    return null;
  }

  return <Navbar />;
}


// =====================================================
// APP CONTENT
// =====================================================

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
      <ThemeBootstrap />
      <PublicNavbar />

      <Suspense
        fallback={<LoadingScreen />}
      >

        <Routes>

          {/* =================================================
              PUBLIC PORTAL
          ================================================= */}

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
  path="/constitution"
  element={<Constitution />}
/>

<Route
  path="/gallery"
  element={<Gallery />}
/>

          <Route
            path="/news"
            element={<News />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />


          {/* =================================================
              LOGIN
          ================================================= */}

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />


          {/* =================================================
              ADMIN PORTAL
          ================================================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                ]}
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

          <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFinance /></ProtectedRoute>} />
          <Route path="/admin/claims" element={<ProtectedRoute allowedRoles={["admin"]}><AdminClaims /></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSupport /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminMessages /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><PortalSettings /></ProtectedRoute>} />
          <Route path="/admin/polls" element={<ProtectedRoute allowedRoles={["admin"]}><Polls mode="admin" /></ProtectedRoute>} />


          {/* =================================================
              MEMBER PORTAL
          ================================================= */}

          <Route
            path="/member"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/profile"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/contributions"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Contributions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/claims"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Claims />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/announcements"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Announcements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/messages"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/notifications"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/settings"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <PortalSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/support"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Support />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member/benefits"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "member",
                ]}
              >
                <Benefits />
              </ProtectedRoute>
            }
          />

          <Route path="/member/dependents" element={<ProtectedRoute allowedRoles={["member"]}><Dependents /></ProtectedRoute>} />
          <Route path="/member/polls" element={<ProtectedRoute allowedRoles={["member"]}><Polls mode="member" /></ProtectedRoute>} />


          {/* =================================================
              SUPERADMIN PORTAL
          ================================================= */}

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

          {/* -----------------------------------------------
              SUPERADMIN → ADMIN MANAGEMENT
          ----------------------------------------------- */}

          <Route
            path="/superadmin/admins"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "superadmin",
                ]}
              >
                <SuperAdminAdmins />
              </ProtectedRoute>
            }
          />

          <Route path="/superadmin/members" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminMembers /></ProtectedRoute>} />
          <Route path="/superadmin/finance" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminFinance /></ProtectedRoute>} />
          <Route path="/superadmin/audit" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminAudit /></ProtectedRoute>} />
          <Route path="/superadmin/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSettings /></ProtectedRoute>} />
          <Route path="/superadmin/system" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSystem /></ProtectedRoute>} />
          <Route path="/superadmin/polls" element={<ProtectedRoute allowedRoles={["superadmin"]}><Polls mode="superadmin" /></ProtectedRoute>} />


          {/* =================================================
              UNKNOWN ROUTES
          ================================================= */}

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


// =====================================================
// ROOT APP
// =====================================================

function App() {
  return (
    <BrowserRouter>

      <ScrollToTop />

      <AppContent />

    </BrowserRouter>
  );
}

export default App;
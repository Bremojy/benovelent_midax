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
import CookieConsent from "./components/CookieConsent";

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

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));

const Login = lazy(
  () => import("./pages/Login")
);

const PortalSettings = lazy(
  () => import("./pages/PortalSettings")
);

const Polls = lazy(() => import("./pages/Polls"));
const PortalGuide = lazy(() => import("./pages/member/PortalGuide"));


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
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));


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
const SuperAdminConstitution = lazy(() => import("./pages/superadmin/SuperAdminConstitution"));
const SuperAdminNotifications = lazy(() => import("./pages/superadmin/SuperAdminNotifications"));
const SuperAdminMessages = lazy(() => import("./pages/superadmin/SuperAdminMessages"));


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
      <CookieConsent />

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

          <Route
            path="/privacy-policy"
            element={<PrivacyPolicy />}
          />

          <Route
            path="/terms-conditions"
            element={<TermsConditions />}
          />



          <Route
            path="/members"
            element={
              <Navigate to="/login" replace />
            }
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

          <Route path="/admin/accounts" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFinance /></ProtectedRoute>} />
          <Route path="/admin/finance" element={<Navigate to="/admin/accounts" replace />} />
          <Route path="/admin/claims" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminClaims /></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminSupport /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMessages /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminNotifications /></ProtectedRoute>} />
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

          <Route path="/member/accounts" element={<ProtectedRoute allowedRoles={["member"]}><Contributions /></ProtectedRoute>} />

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
          <Route path="/member/guide" element={<ProtectedRoute allowedRoles={["member"]}><PortalGuide /></ProtectedRoute>} />
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
          <Route path="/superadmin/accounts" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminFinance /></ProtectedRoute>} />
          <Route path="/superadmin/finance" element={<Navigate to="/superadmin/accounts" replace />} />
          <Route path="/superadmin/audit" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminAudit /></ProtectedRoute>} />
          <Route path="/superadmin/notifications" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminNotifications /></ProtectedRoute>} />
          <Route path="/superadmin/messages" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminMessages /></ProtectedRoute>} />
          <Route path="/superadmin/claims" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminClaims /></ProtectedRoute>} />
          <Route path="/superadmin/support" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminSupport /></ProtectedRoute>} />
          <Route path="/superadmin/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSettings /></ProtectedRoute>} />
          <Route path="/superadmin/password" element={<ProtectedRoute allowedRoles={["superadmin"]}><PortalSettings /></ProtectedRoute>} />
          <Route path="/superadmin/system" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminSystem /></ProtectedRoute>} />
          <Route path="/superadmin/constitution" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminConstitution /></ProtectedRoute>} />
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
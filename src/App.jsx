import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { lazy, Suspense } from "react";

import ScrollToTop from "./components/ScrollToTop";

// ========================================
// LAZY LOADED PAGES
// ========================================

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Leaders = lazy(() => import("./pages/Leaders"));
const Members = lazy(() => import("./pages/Members"));
const News = lazy(() => import("./pages/News"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));

const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard")
);

const MemberDashboard = lazy(() =>
  import("./pages/member/MemberDashboard")
);

const SuperAdminDashboard = lazy(() =>
  import("./pages/superadmin/SuperAdminDashboard")
);

// ========================================
// COMPONENTS
// ========================================

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// ========================================
// GLOBAL CSS
// ========================================

import "./App.css";

// ========================================
// LOADING SCREEN
// ========================================

function LoadingScreen() {
  return (
    <div
      style={{
        height: "100vh",
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
// PROTECTED ROUTES
// ========================================

function ProtectedAdmin() {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <AdminDashboard />;
}

function ProtectedMember() {
  const token = localStorage.getItem("memberToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <MemberDashboard />;
}

function ProtectedSuperAdmin() {
  const token = localStorage.getItem("superAdminToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <SuperAdminDashboard />;
}

// ========================================
// PUBLIC NAVBAR
// ========================================

function PublicNavbar() {
  const location = useLocation();

  const hideNavbar =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member") ||
    location.pathname.startsWith("/superadmin") ||
    location.pathname === "/login";

  if (hideNavbar) return null;

  return <Navbar />;
}

// ========================================
// MAIN CONTENT
// ========================================

function AppContent() {
  const location = useLocation();

  const hideFooter =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member") ||
    location.pathname.startsWith("/superadmin") ||
    location.pathname === "/login";

  return (
    <>
      <PublicNavbar />

      <Suspense fallback={<LoadingScreen />}>

        <Routes>

          {/* PUBLIC */}

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

          <Route
            path="/login"
            element={<Login />}
          />

          {/* PORTALS */}

          <Route
            path="/admin"
            element={<ProtectedAdmin />}
          />

          <Route
            path="/member"
            element={<ProtectedMember />}
          />

          <Route
            path="/superadmin"
            element={<ProtectedSuperAdmin />}
          />

          {/* 404 */}

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
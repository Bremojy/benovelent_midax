import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import {
  lazy,
  Suspense,
} from "react";

// ========================================
// LAZY LOADED PAGES
// ========================================

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const Members = lazy(() => import("./pages/Members"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() =>
  import("./pages/AdminDashboard")
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
// SIMPLE LOADING SCREEN
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
        fontSize: "22px",
        fontWeight: "700",
        color: "#ff7a00",
      }}
    >
      Loading...
    </div>
  );
}

// ========================================
// PROTECTED ADMIN ROUTE
// ========================================

function ProtectedAdmin() {
  const token = localStorage.getItem("adminToken");
  const user = localStorage.getItem("adminUser");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <AdminDashboard />;
}

// ========================================
// PUBLIC NAVBAR
// ========================================

function PublicNavbar() {
  const location = useLocation();

  const hideNavbar =
    location.pathname.startsWith("/admin") ||
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
    location.pathname === "/login";

  return (
    <>
      <PublicNavbar />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
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
            path="/members"
            element={<Members />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/admin"
            element={<ProtectedAdmin />}
          />

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
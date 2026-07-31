import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function AuthLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f6f7",
        color: "#ff7a00",
        fontSize: "20px",
        fontWeight: "700",
      }}
    >
      Verifying your account...
    </div>
  );
}

function getPortalPath(role) {
  switch (
    (role || "").toLowerCase()
  ) {
    case "member":
      return "/member";

    case "admin":
      return "/admin";

    case "superadmin":
      return "/superadmin";

    default:
      return "/login";
  }
}

function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const location = useLocation();

  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  // ======================================
  // WAIT FOR SESSION CHECK
  // ======================================

  if (loading) {
    return <AuthLoading />;
  }

  // ======================================
  // NOT LOGGED IN
  // ======================================

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const role = (
    user.role || ""
  ).toLowerCase();

  // ======================================
  // ROLE NOT ALLOWED
  // ======================================

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to={getPortalPath(role)}
        replace
      />
    );
  }

  // ======================================
  // AUTHORIZED
  // ======================================

  return children;
}

export default ProtectedRoute;
import {
  Navigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

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

function PublicOnlyRoute({
  children,
}) {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f6f7",
          color: "#ff7a00",
          fontSize: "20px",
          fontWeight: "700",
        }}
      >
        Loading...
      </div>
    );
  }

  if (
    isAuthenticated &&
    user
  ) {
    return (
      <Navigate
        to={getPortalPath(user.role)}
        replace
      />
    );
  }

  return children;
}

export default PublicOnlyRoute;
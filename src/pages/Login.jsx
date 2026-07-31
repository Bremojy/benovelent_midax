import {
  useEffect,
  useState,
} from "react";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "./Login.css";

function getPortalPath(role) {
  switch (
    (role || "").toLowerCase()
  ) {
    case "superadmin":
      return "/superadmin";

    case "admin":
      return "/admin";

    case "member":
      return "/member";

    default:
      return "/login";
  }
}

function Login() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    login,
    user,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  // ======================================
  // REDIRECT IF ALREADY LOGGED IN
  // ======================================

  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user
    ) {
      navigate(
        getPortalPath(user.role),
        { replace: true }
      );
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    navigate,
  ]);

  // ======================================
  // LOGIN
  // ======================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await login(
          cleanEmail,
          password
        );

      const role =
        result.user.role;

      const portal =
        getPortalPath(role);

      const from =
        location.state?.from;

      // Only use a previous protected
      // location if it belongs to the
      // authenticated user's portal.
      const validPreviousPath =
        typeof from === "string" &&
        (
          (role === "member" &&
            from.startsWith(
              "/member"
            )) ||
          (role === "admin" &&
            from.startsWith(
              "/admin"
            )) ||
          (role === "superadmin" &&
            from.startsWith(
              "/superadmin"
            ))
        );

      navigate(
        validPreviousPath
          ? from
          : portal,
        { replace: true }
      );

    } catch (err) {
      console.error(
        "Login failed:",
        err
      );

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // UI
  // ======================================

  return (
    <main className="modern-login-page">

      <div className="login-background">

        <div className="login-blob blob1"></div>

        <div className="login-blob blob2"></div>

        <div className="login-blob blob3"></div>

      </div>

      <div className="login-wrapper">

        {/* LEFT SIDE */}

        <div className="login-info">

          <div className="brand-badge">
            BENEVOLENT MIDAX
          </div>

          <h1>
            Welcome Back
          </h1>

          <div className="portal-badges">
            <span>Member</span>
            <span>Admin</span>
            <span>
              Super Admin
            </span>
          </div>

          <p className="login-subtitle">
            Sign in to access your
            Benevolent Midax account.
          </p>

          <p>
            Secure access to the
            Benevolent Midax
            Management System.
            Manage members,
            finances, assistance
            requests and administration
            from one centralized
            dashboard.
          </p>

          <div className="login-features">

            <div>
              ✓ Secure Authentication
            </div>

            <div>
              ✓ Member Management
            </div>

            <div>
              ✓ Financial Tracking
            </div>

            <div>
              ✓ Website Administration
            </div>

          </div>

        </div>

        {/* LOGIN CARD */}

        <div className="modern-login-card">

          <div className="login-header">

            <p className="section-label">
              SECURE LOGIN
            </p>

            <h2>
              Welcome Back
            </h2>

            <span>
              Members, Administrators
              and Super Administrators
              can sign in here.
            </span>

          </div>

          {error && (
            <div className="login-error">
              ⚠ {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="login-form"
          >

            <label>
              Email Address
            </label>

            <div className="input-group">

              <Mail size={19} />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
                disabled={loading}
                required
              />

            </div>

            <label>
              Password
            </label>

            <div className="input-group">

              <Lock size={19} />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="login-spinner"
                  />

                  Signing in...
                </>
              ) : (
                "Sign In"
              )}

            </button>

          </form>

        </div>

      </div>

    </main>
  );
}

export default Login;
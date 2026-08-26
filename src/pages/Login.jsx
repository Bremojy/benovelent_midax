import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";


const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

function getPortalPath(role) {
  switch ((role || "").toLowerCase()) {
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

const loginVideoSources = [import.meta.env.VITE_LOGIN_VIDEO_URL || "/videos/benevolent-login-loop.mp4"];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, loading: authLoading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getPortalPath(user.role), { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password);
      const role = (result?.user?.role || "").toLowerCase();
      const portal = getPortalPath(role);
      const from = location.state?.from;

      const validPreviousPath =
        typeof from === "string" &&
        ((role === "member" && from.startsWith("/member")) ||
          (role === "admin" && from.startsWith("/admin")) ||
          (role === "superadmin" && from.startsWith("/superadmin")));

      navigate(validPreviousPath ? from : portal, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      let message = err?.response?.data?.message || "";

      if (!message) {
        if (status === 403 && code === "CSRF_INVALID") {
          message = "Your secure login session needs to be refreshed. Please try again.";
        } else if (status === 429) {
          message = "Too many login attempts. Please wait a few minutes and try again.";
        } else if (status >= 500) {
          message = "The server is temporarily unavailable. Please try again shortly.";
        } else if (!err?.response) {
          message = "Unable to reach Benevolent MIDAX. Check your internet connection and try again.";
        } else {
          message = "Unable to sign in. Please check your email and password.";
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`modern-login-page ${videoFailed ? "video-failed" : ""}`}>
      {!videoFailed && (
        <video
          className="login-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero.jpg"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        >
          {loginVideoSources.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
      )}
      <div className="login-video-overlay" />
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-card-shell">
        <div className="login-brand-mark">B</div>

        <div className="login-card-heading">
          <span className="login-kicker">
            <ShieldCheck size={15} />
            SECURE MEMBER ACCESS
          </span>
          <h1>Welcome back</h1>
          <p>Sign in to continue to Benovelent Midax.</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <label htmlFor="login-email">Email Address</label>
          <div className="input-group">
            <Mail size={19} aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trimStart())}
              autoComplete="username"
              inputMode="email"
              disabled={loading}
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="input-group">
            <Lock size={19} aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={19} className="login-spinner" />
                Signing in...
              </>
            ) : (
              "Sign In Securely"
            )}
          </button>
        </form>

        <div className="login-trust">
          <ShieldCheck size={17} />
          <span>Your account and access are protected.</span>
        </div>
      </div>
    </main>
  );
}

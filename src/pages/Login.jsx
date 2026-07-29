import { useState } from "react";
import "./Login.css";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();

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

const handleLogin = async (e) => {
  e.preventDefault();

  setError("");
  setLoading(true);

  try {
    const API =
      import.meta.env.VITE_API_URL ||
      "https://benovelent-midax.onrender.com";

    const response = await fetch(
      `${API}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Login failed");
      setLoading(false);
      return;
    }

    const { token, user } = data;

    // Clear previous sessions
    localStorage.removeItem("memberToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("superAdminToken");

    // Save logged in user
    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    switch ((user.role || "").toLowerCase()) {

      case "superadmin":
        localStorage.setItem(
          "superAdminToken",
          token
        );
        navigate("/superadmin");
        break;

      case "admin":
        localStorage.setItem(
          "adminToken",
          token
        );
        navigate("/admin");
        break;

      case "member":
        localStorage.setItem(
          "memberToken",
          token
        );
        navigate("/member");
        break;

      default:
        setError("Unknown user role.");
        localStorage.clear();
        break;
    }

  } catch (err) {
    console.error(err);
    setError("Unable to connect to server.");
  } finally {
    setLoading(false);
  }
};


  return (

    <main className="modern-login-page">

  {/* Background */}

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
  <span>Super Admin</span>
</div>

<p className="login-subtitle">
Sign in to access your Benevolent Midax account.
</p>

      <p>

        Secure access to the Benevolent Midax
        Management System.

        Manage members, website content,
        finances, leadership and assistance
        requests from one centralized dashboard.

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

          Members, Administrators and Super Administrators can sign in here.

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

       <label>Email Address</label>

<div className="input-group">

  <Mail size={19} />

  <input
    type="email"
    placeholder="Enter your email"
    value={email}
    onChange={(e) =>
      setEmail(e.target.value)
    }
    required
  />

</div>

<label>Password</label>

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
      setPassword(e.target.value)
    }
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() =>
      setShowPassword(
        !showPassword
      )
    }
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
        size={20}
        className="spin"
      />

      Signing In...

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
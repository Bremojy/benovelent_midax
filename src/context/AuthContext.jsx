import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getCsrfToken,
  getCurrentUser,
  loginUser,
  logoutUser,
} from "../services/authService";

const AuthContext = createContext(null);

// ========================================
// SESSION SETTINGS
// ========================================

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

const clearStoredSession = () => {
  try { sessionStorage.removeItem("user"); } catch {}
  try { sessionStorage.removeItem("benovelentMidaxLastActivity"); } catch {}
};

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Invalid stored user:", error);
    return null;
  }
};

const saveSession = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (!["member", "admin", "superadmin"].includes(role)) {
    throw new Error("Unknown account role.");
  }
  sessionStorage.setItem("user", JSON.stringify({ ...user, role }));
  sessionStorage.setItem("benovelentMidaxLastActivity", String(Date.now()));
};

// ========================================
// AUTH PROVIDER
// ========================================

export function AuthProvider({
  children,
}) {
  // Restore the last known account immediately. The backend may take a moment
  // to wake after a refresh, but that should never throw an already-authenticated
  // member back to the login page.
  const [user, setUser] =
    useState(() => getStoredUser());

  const [loading, setLoading] =
    useState(() => !Boolean(getStoredUser()));

  const [authError, setAuthError] =
    useState("");

  // ======================================
  // INACTIVITY TIMER REF
  // ======================================

  const inactivityTimer =
    useRef(null);

  // ======================================
  // CLEAR INACTIVITY TIMER
  // ======================================

  const clearInactivityTimer =
    useCallback(() => {
      if (
        inactivityTimer.current
      ) {
        clearTimeout(
          inactivityTimer.current
        );

        inactivityTimer.current =
          null;
      }
    }, []);

  // ======================================
  // CLEAR SESSION
  // ======================================

  const clearSession =
    useCallback(() => {
      clearInactivityTimer();

      clearStoredSession();

      setUser(null);
      setAuthError("");
    }, [
      clearInactivityTimer,
    ]);

  // ======================================
  // AUTOMATIC INACTIVITY LOGOUT
  // ======================================

  const handleInactivityLogout =
    useCallback(async () => {
      console.warn("Session expired because of inactivity.");
      try { await logoutUser(); } catch {}
      clearSession();
      setAuthError("You have been logged out due to inactivity.");
    }, [clearSession]);

  // ======================================
  // RESET INACTIVITY TIMER
  // ======================================

  const resetInactivityTimer =
    useCallback(() => {
      // No authenticated user
      // means no timer is required.
      if (!user) {
        clearInactivityTimer();
        return;
      }

      // Clear previous timer.
      clearInactivityTimer();

      const now = Date.now();

      sessionStorage.setItem(
        "benovelentMidaxLastActivity",
        String(now)
      );

      inactivityTimer.current =
        setTimeout(
          handleInactivityLogout,
          INACTIVITY_TIMEOUT
        );
    }, [
      user,
      clearInactivityTimer,
      handleInactivityLogout,
    ]);

  // ======================================
  // LOAD CURRENT USER
  // ======================================

  const loadCurrentUser =
    useCallback(
      async () => {
        try {
          await getCsrfToken();
          // When a cached user exists, keep the dashboard rendered while the
          // server verifies the session in the background.
          if (!user) setLoading(true);
          setAuthError("");

          // --------------------------------
          // Check inactivity timestamp
          // --------------------------------

          const lastActivity =
            Number(
              sessionStorage.getItem(
                "benovelentMidaxLastActivity"
              )
            );

          if (
            lastActivity &&
            Date.now() -
              lastActivity >=
              INACTIVITY_TIMEOUT
          ) {
            clearSession();

            setAuthError(
              "Your session expired due to inactivity."
            );

            return null;
          }

          // --------------------------------
          // Verify backend session
          // --------------------------------

          const response =
            await getCurrentUser();

          if (
            !response?.success ||
            !response?.user
          ) {
            throw new Error(
              response?.message ||
                "Unable to verify session."
            );
          }

          const currentUser = {
            ...response.user,

            role: (
              response.user.role ||
              ""
            ).toLowerCase(),
          };

          // --------------------------------
          // Validate role
          // --------------------------------

          if (
            ![
              "member",
              "admin",
              "superadmin",
            ].includes(
              currentUser.role
            )
          ) {
            throw new Error(
              "Invalid account role."
            );
          }

          // --------------------------------
          // Compare stored role
          // --------------------------------

          const storedUser =
            getStoredUser();

          if (
            storedUser?.role &&
            currentUser.role !==
              storedUser.role
          ) {
            throw new Error(
              "Account role has changed. Please log in again."
            );
          }

          // --------------------------------
          // Store normalized user
          // --------------------------------

          sessionStorage.setItem(
            "user",
            JSON.stringify(
              currentUser
            )
          );

          // If there was no previous
          // activity timestamp, create one.
          if (!lastActivity) {
            sessionStorage.setItem(
              "benovelentMidaxLastActivity",
              String(Date.now())
            );
          }

          setUser(currentUser);

          return currentUser;

        } catch (error) {
          const status = error?.response?.status;
          const code = error?.response?.data?.code;
          const definitiveAuthFailure =
            status === 401 ||
            [
              "TOKEN_EXPIRED",
              "TOKEN_INVALID",
              "TOKEN_MISSING",
              "USER_NOT_FOUND",
              "AUTH_FAILED",
              "SESSION_REPLACED",
            ].includes(code);

          if (definitiveAuthFailure) {
            console.warn("Session verification rejected:", error);
            clearSession();
            setAuthError(
              error.response?.data?.message ||
              error.message ||
              "Your session has expired."
            );
            return null;
          }

          // Network errors, Render cold starts, timeouts and temporary 5xx
          // responses are not logout conditions. Keep the cached user and let
          // the next verification restore a healthy connection.
          console.warn(
            "Session verification temporarily unavailable:",
            error.response?.data || error.message
          );
          setAuthError(
            "Connection is slow. Your saved session is still active."
          );
          return user || getStoredUser();

        } finally {
          setLoading(false);
        }
      },
      [clearSession, user]
    );

  // ======================================
  // SERVER-SIDE SESSION REPLACEMENT
  // ======================================

  useEffect(() => {
    const handleSessionEnded = (event) => {
      const message = event.detail?.message || "Your session has ended.";
      clearSession();
      setAuthError(message);
    };
    window.addEventListener("benevolent:session-ended", handleSessionEnded);
    return () => window.removeEventListener("benevolent:session-ended", handleSessionEnded);
  }, [clearSession]);

  // Verify the JWT periodically so a dashboard that is not using chat still
  // notices when the account signs in on another device.
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => { loadCurrentUser(); }, 60000);
    return () => window.clearInterval(timer);
  }, [user, loadCurrentUser]);

  // ======================================
  // INITIAL AUTH CHECK
  // ======================================

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ======================================
  // LOGIN
  // ======================================

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        setAuthError("");

        try {
          const response =
            await loginUser(
              email,
              password
            );

          if (
            !response?.success ||
            !response?.user
          ) {
            throw new Error(
              response?.message ||
                "Login failed."
            );
          }

          const normalizedUser = {
            ...response.user,

            role: (
              response.user.role ||
              ""
            ).toLowerCase(),
          };

          // --------------------------------
          // Validate role
          // --------------------------------

          if (
            ![
              "member",
              "admin",
              "superadmin",
            ].includes(
              normalizedUser.role
            )
          ) {
            throw new Error(
              "Unknown account role."
            );
          }

          // --------------------------------
          // Save session
          // --------------------------------

          saveSession(normalizedUser);

          setUser(
            normalizedUser
          );

          return {
            user: normalizedUser,
          };

        } catch (error) {
          setAuthError(
            error.response?.data
              ?.message ||
              error.message ||
              "Login failed."
          );

          throw error;
        }
      },
      []
    );

  // ======================================
  // LOGOUT
  // ======================================

  const logout =
    useCallback(
      async () => {
        try {
          await logoutUser();
        } catch (error) {
          console.error(
            "Logout request failed:",
            error
          );
        } finally {
          clearSession();

            }
      },
      [
        clearSession,
      ]
    );

  // ======================================
  // ACTIVITY LISTENER
  // ======================================

  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return undefined;
    }

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    let lastActivityHandled = 0;

    const handleActivity = () => {
      const now = Date.now();

      // Prevent excessive sessionStorage writes
      // when mousemove fires continuously.
      if (
        now - lastActivityHandled <
        5000
      ) {
        return;
      }

      lastActivityHandled = now;

      resetInactivityTimer();
    };

    activityEvents.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive: true,
          }
        );
      }
    );

    // Start timer immediately.
    resetInactivityTimer();

    return () => {
      activityEvents.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity
          );
        }
      );

      clearInactivityTimer();
    };
  }, [
    user,
    resetInactivityTimer,
    clearInactivityTimer,
  ]);

  // ======================================
  // SERVER-SIDE SESSION REPLACEMENT
  // ======================================

  useEffect(() => {
    const handleSessionReplaced = () => {
      clearSession();
      setAuthError("Your account was signed in on another device. You have been logged out for security.");
      try { window.dispatchEvent(new CustomEvent("benovelent:session-replaced-ui")); } catch {}
    };
    window.addEventListener("benovelent:session-replaced", handleSessionReplaced);
    return () => window.removeEventListener("benovelent:session-replaced", handleSessionReplaced);
  }, [clearSession]);


  // ======================================
  // PORTAL THEME
  // ======================================

  useEffect(() => {
    const color = user?.themeColor || "#ff7a00";
    document.documentElement.style.setProperty("--portal-accent", color);
    document.documentElement.style.setProperty("--portal-accent-soft", `${color}18`);
  }, [user?.themeColor]);

  // ======================================
  // ROLE HELPERS
  // ======================================

  const role = (
    user?.role || ""
  ).toLowerCase();

  const isMember =
    role === "member";

  const isAdmin =
    role === "admin";

  const isSuperAdmin =
    role === "superadmin";

  const isAuthenticated =
    Boolean(user);

  // ======================================
  // CONTEXT VALUE
  // ======================================

  const value = useMemo(
    () => ({
      user,

      role,

      loading,

      authError,

      isAuthenticated,

      isMember,

      isAdmin,

      isSuperAdmin,

      login,

      logout,

      refreshUser:
        loadCurrentUser,

      clearSession,
    }),
    [
      user,
      role,
      loading,
      authError,
      isAuthenticated,
      isMember,
      isAdmin,
      isSuperAdmin,
      login,
      logout,
      loadCurrentUser,
      clearSession,
    ]
  );

  // ======================================
  // PROVIDER
  // ======================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ========================================
// USE AUTH
// ========================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
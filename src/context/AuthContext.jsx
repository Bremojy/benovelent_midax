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
const ACTIVE_ACCOUNT_KEY = "benovelentMidaxActiveAccount";
const LOGGED_OUT_KEY = "benovelentMidaxLoggedOut";

const normalizeAccountIdentity = (value) => ({
  id: String(value?.id || value?._id || value?.chatId || ""),
  role: String(value?.role || "").toLowerCase(),
});

const setActiveAccount = (value) => {
  try {
    const identity = normalizeAccountIdentity(value);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify({ ...identity, changedAt: Date.now() }));
  } catch {}
};

const clearActiveAccount = () => {
  try { localStorage.removeItem(ACTIVE_ACCOUNT_KEY); } catch {}
};

const markLoggedOut = () => {
  try { localStorage.setItem(LOGGED_OUT_KEY, String(Date.now())); } catch {}
};

const clearLoggedOutMarker = () => {
  try { localStorage.removeItem(LOGGED_OUT_KEY); } catch {}
};

const wasExplicitlyLoggedOut = () => {
  try { return Boolean(localStorage.getItem(LOGGED_OUT_KEY)); } catch { return false; }
};


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
  // The server-side HttpOnly cookie is the authentication source of truth.
  // Do not render a cached browser profile as authenticated until /auth/me
  // confirms the current session.
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

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

  // Re-bind the browser push subscription after authentication. A service worker
  // registered before login cannot reliably save the subscription to the correct
  // member account until /auth/me has confirmed who is signed in.
  useEffect(() => {
    if (!user || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const API = (await import("../services/api")).default;
        const { data } = await API.get("/notifications/push/vapid-public-key");
        if (!data?.configured || !data?.publicKey || cancelled) return;
        const key = data.publicKey;
        const padding = "=".repeat((4 - (key.length % 4)) % 4);
        const raw = window.atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));
        const appServerKey = Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
        }
        if (!cancelled && subscription) await API.post("/notifications/push/subscribe", { subscription: subscription.toJSON() });
      } catch (error) {
        console.debug("Authenticated push subscription skipped:", error?.message || error);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

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
          if (wasExplicitlyLoggedOut()) {
            clearStoredSession();
            clearActiveAccount();
            setUser(null);
            return null;
          }
          await getCsrfToken();
          // When a cached user exists, keep the dashboard rendered while the
          // server verifies the session in the background.
          if (!getStoredUser()) setLoading(true);
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
          setActiveAccount(currentUser);

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
            "Connection is temporarily unavailable. Please wait and try again."
          );
          return null;

        } finally {
          setLoading(false);
        }
      },
      [clearSession]
    );

  // ======================================
  // ONE ACCOUNT PER BROWSER ORIGIN
  // ======================================

  useEffect(() => {
    const handleStorage = (event) => {
      const raw = event?.type === "storage" ? event.newValue : JSON.stringify(event?.data?.account || {});
      if (event?.type === "storage" && event.key !== ACTIVE_ACCOUNT_KEY) return;
      if (!raw) return;
      try {
        const incoming = JSON.parse(raw);
        const current = normalizeAccountIdentity(user);
        if (!current.id || !incoming?.id) return;
        if (current.id !== String(incoming.id) || current.role !== String(incoming.role || "").toLowerCase()) {
          clearSession();
          setAuthError("Another account was signed in on this device. You have been logged out from this portal.");
          window.dispatchEvent(new CustomEvent("benevolent:session-ended", { detail: { message: "Another account was signed in on this device." } }));
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("benovelent-account-session") : null;
    channel?.addEventListener("message", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close?.();
    };
  }, [user, clearSession]);

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
          clearLoggedOutMarker();
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
        markLoggedOut();
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
  // ONE ACCOUNT PER BROWSER ORIGIN
  // ======================================

  useEffect(() => {
    const handleStorage = (event) => {
      const raw = event?.type === "storage" ? event.newValue : JSON.stringify(event?.data?.account || {});
      if (event?.type === "storage" && event.key !== ACTIVE_ACCOUNT_KEY) return;
      if (!raw) return;
      try {
        const incoming = JSON.parse(raw);
        const current = normalizeAccountIdentity(user);
        if (!current.id || !incoming?.id) return;
        if (current.id !== String(incoming.id) || current.role !== String(incoming.role || "").toLowerCase()) {
          clearSession();
          setAuthError("Another account was signed in on this device. You have been logged out from this portal.");
          window.dispatchEvent(new CustomEvent("benevolent:session-ended", { detail: { message: "Another account was signed in on this device." } }));
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("benovelent-account-session") : null;
    channel?.addEventListener("message", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close?.();
    };
  }, [user, clearSession]);

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
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
  getCurrentUser,
  loginUser,
  logoutUser,
} from "../services/authService";

const AuthContext = createContext(null);

// ========================================
// TOKEN KEYS
// ========================================

const TOKEN_KEYS = {
  member: "memberToken",
  admin: "adminToken",
  superadmin: "superAdminToken",
};

// ========================================
// SESSION SETTINGS
// ========================================

// 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// Key used to synchronize logout
// between multiple browser tabs/windows.
const SESSION_EVENT_KEY =
  "benovelentMidaxSessionEvent";

// ========================================
// CLEAR STORED SESSION
// ========================================

const clearStoredSession = () => {
  Object.values(TOKEN_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  localStorage.removeItem("user");

  // Also remove inactivity timestamp.
  localStorage.removeItem(
    "benovelentMidaxLastActivity"
  );
};

// ========================================
// GET STORED USER
// ========================================

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch (error) {
    console.error(
      "Invalid stored user:",
      error
    );

    return null;
  }
};

// ========================================
// GET TOKEN FOR ROLE
// ========================================

const getTokenForRole = (role) => {
  const normalizedRole =
    (role || "").toLowerCase();

  const tokenKey =
    TOKEN_KEYS[normalizedRole];

  if (!tokenKey) {
    return null;
  }

  return localStorage.getItem(tokenKey);
};

// ========================================
// GET STORED TOKEN
// ========================================

const getStoredToken = () => {
  const storedUser = getStoredUser();

  // ----------------------------------------
  // Prefer token matching stored role
  // ----------------------------------------

  if (storedUser?.role) {
    const roleToken =
      getTokenForRole(
        storedUser.role
      );

    if (roleToken) {
      return roleToken;
    }
  }

  // ----------------------------------------
  // Fallback
  // ----------------------------------------

  for (const key of Object.values(
    TOKEN_KEYS
  )) {
    const token =
      localStorage.getItem(key);

    if (token) {
      return token;
    }
  }

  return null;
};

// ========================================
// SAVE SESSION
// ========================================

const saveSession = (
  token,
  user
) => {
  clearStoredSession();

  const role = (
    user?.role || ""
  ).toLowerCase();

  if (!token || !role) {
    throw new Error(
      "Invalid authentication response."
    );
  }

  const tokenKey =
    TOKEN_KEYS[role];

  if (!tokenKey) {
    throw new Error(
      "Unknown account role."
    );
  }

  localStorage.setItem(
    tokenKey,
    token
  );

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...user,
      role,
    })
  );

  // Start a fresh inactivity period.
  localStorage.setItem(
    "benovelentMidaxLastActivity",
    String(Date.now())
  );
};

// ========================================
// AUTH PROVIDER
// ========================================

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

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
  // BROADCAST LOGOUT
  // ======================================

  const broadcastSessionLogout =
    useCallback(() => {
      localStorage.setItem(
        SESSION_EVENT_KEY,
        JSON.stringify({
          type: "logout",
          timestamp: Date.now(),
        })
      );
    }, []);

  // ======================================
  // AUTOMATIC INACTIVITY LOGOUT
  // ======================================

  const handleInactivityLogout =
    useCallback(() => {
      console.warn(
        "Session expired because of inactivity."
      );

      clearSession();

      setAuthError(
        "You have been logged out due to inactivity."
      );

      broadcastSessionLogout();
    }, [
      clearSession,
      broadcastSessionLogout,
    ]);

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

      localStorage.setItem(
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
        const token =
          getStoredToken();

        if (!token) {
          setUser(null);
          setLoading(false);

          return null;
        }

        try {
          setLoading(true);
          setAuthError("");

          // --------------------------------
          // Check inactivity timestamp
          // --------------------------------

          const lastActivity =
            Number(
              localStorage.getItem(
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
          // Verify matching token
          // --------------------------------

          const roleToken =
            getTokenForRole(
              currentUser.role
            );

          if (!roleToken) {
            throw new Error(
              "Authentication token is missing."
            );
          }

          // --------------------------------
          // Store normalized user
          // --------------------------------

          localStorage.setItem(
            "user",
            JSON.stringify(
              currentUser
            )
          );

          // If there was no previous
          // activity timestamp, create one.
          if (!lastActivity) {
            localStorage.setItem(
              "benovelentMidaxLastActivity",
              String(Date.now())
            );
          }

          setUser(currentUser);

          return currentUser;

        } catch (error) {
          console.error(
            "Session verification failed:",
            error
          );

          clearSession();

          setAuthError(
            error.response?.data
              ?.message ||
              error.message ||
              "Your session has expired."
          );

          return null;

        } finally {
          setLoading(false);
        }
      },
      [clearSession]
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
            !response?.token ||
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

          saveSession(
            response.token,
            normalizedUser
          );

          setUser(
            normalizedUser
          );

          return {
            token:
              response.token,

            user:
              normalizedUser,
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

          broadcastSessionLogout();
        }
      },
      [
        clearSession,
        broadcastSessionLogout,
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

      // Prevent excessive localStorage writes
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
      try {
        localStorage.setItem(SESSION_EVENT_KEY, JSON.stringify({ type: "logout", reason: "session-replaced", timestamp: Date.now() }));
      } catch {}
      try { window.dispatchEvent(new CustomEvent("benovelent:session-replaced-ui")); } catch {}
    };
    window.addEventListener("benovelent:session-replaced", handleSessionReplaced);
    return () => window.removeEventListener("benovelent:session-replaced", handleSessionReplaced);
  }, [clearSession]);

  // ======================================
  // CROSS-TAB SESSION SYNC
  // ======================================

  useEffect(() => {
    const handleStorageChange =
      (event) => {
        if (
          event.key !==
          SESSION_EVENT_KEY
        ) {
          return;
        }

        try {
          const eventData =
            JSON.parse(
              event.newValue || "{}"
            );

          if (
            eventData.type ===
            "logout"
          ) {
            clearSession();
          }
        } catch (error) {
          console.error(
            "Session sync error:",
            error
          );
        }
      };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
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
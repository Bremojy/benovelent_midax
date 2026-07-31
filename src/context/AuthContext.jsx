import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
// CLEAR STORED SESSION
// ========================================

const clearStoredSession = () => {
  Object.values(TOKEN_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  localStorage.removeItem("user");
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
  // CLEAR SESSION
  // ======================================

  const clearSession =
    useCallback(() => {
      clearStoredSession();

      setUser(null);
      setAuthError("");
    }, []);

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
        }
      },
      [clearSession]
    );

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

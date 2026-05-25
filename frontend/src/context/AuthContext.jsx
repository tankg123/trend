import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY || "";

const AuthContext = createContext(null);
const SUPER_ADMIN_ROLES = ["supper admin", "super admin"];

function normalizedRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSuperAdminRole(role) {
  return SUPER_ADMIN_ROLES.includes(normalizedRole(role));
}

function loadSavedUser() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser || savedUser === "undefined" || savedUser === "null") {
    localStorage.removeItem("user");
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return loadSavedUser();
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || "";
  });

  const [authLoading, setAuthLoading] = useState(true);

  function saveAuth(authToken, authUser) {
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  }

  function updateSavedUser(authUser, authToken = token) {
    if (authToken) localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    if (authToken) setToken(authToken);
    setUser(authUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  }

  async function checkAuth() {
    try {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        setAuthLoading(false);
        return;
      }

      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "x-api-key": BACKEND_API_KEY
        }
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setToken(savedToken);
    } catch {
      logout();
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    (() => {
      const role = normalizedRole(user?.role);
      const isAdmin = role === "admin" || isSuperAdminRole(role);
      const isReportManager = role === "report manager";
      const isChannelManagement = role === "channel management";
      const isPartnerRole = role === "partner";

      return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authLoading,
        saveAuth,
        updateSavedUser,
        logout,
        role,
        isSuperAdmin: isSuperAdminRole(role),
        isAdmin,
        isReportManager,
        isChannelManagement,
        isPartnerRole,
        isManager: isReportManager,
        canViewReports: isAdmin || isReportManager,
        canViewPartnerGroups: isAdmin || isReportManager || isPartnerRole,
        canViewChannelManagement: isAdmin || isChannelManagement,
        canViewContentId: isAdmin || isReportManager || isChannelManagement,
        canViewExpense: isAdmin || isReportManager,
        canViewPartner: isAdmin || isReportManager || isChannelManagement,
        canViewAccount: isAdmin,
        canViewSettings: isAdmin,
        isUser: role === "user"
      }}
    >
      {children}
    </AuthContext.Provider>
      );
    })()
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

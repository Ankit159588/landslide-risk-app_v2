import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setAccessToken, setLogoutHandler } from "../api/axiosInstance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we try silent refresh on load

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutHandler(clearSession);
  }, [clearSession]);

  // On first load, try to silently refresh using the httpOnly cookie so a
  // page reload doesn't force a fresh login.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.accessToken);
        setUser(data.user || null);
      } catch {
        // no valid session - that's fine, user just sees the login page
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const requestLoginOtp = async (email) => {
    const { data } = await api.post("/auth/login/request-otp", { email });
    return data;
  };

  const verifyLoginOtp = async (email, otp) => {
    const { data } = await api.post("/auth/login/verify-otp", { email, otp });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  };

  const verifyRegisterOtp = async (email, otp) => {
    const { data } = await api.post("/auth/register/verify-otp", { email, otp });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        requestLoginOtp,
        verifyLoginOtp,
        register,
        verifyRegisterOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

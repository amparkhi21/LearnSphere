import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const { user: u, token } = await authApi.login(credentials);
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  };

  const register = async (payload) => {
    const { user: u, token } = await authApi.register(payload);
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateLocalUser = (partial) => setUser((prev) => ({ ...prev, ...partial }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

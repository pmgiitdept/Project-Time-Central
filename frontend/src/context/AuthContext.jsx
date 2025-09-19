import { createContext, useState, useEffect } from "react";
import api from "../api"; // your axios instance or API helper

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Try to fetch current user info from token
    const token = localStorage.getItem("token"); // assuming you store JWT here
    if (!token) return;

    // Decode token or fetch user data from backend
    api
      .get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCurrentUser({ ...res.data, token }))
      .catch((err) => {
        console.error("Failed to fetch user:", err);
        setCurrentUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

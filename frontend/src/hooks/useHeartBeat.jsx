// src/hooks/useHeartbeat.jsx
import { useEffect, useRef } from "react";
import api from "../api";

export default function useHeartbeat() {
  const intervalRef = useRef(null);

  useEffect(() => {
    const startPing = () => {
      if (intervalRef.current) return; // already running
      intervalRef.current = setInterval(async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        try {
          await api.post("/auth/ping/");
        } catch (err) {
          console.warn("Ping failed:", err);
        }
      }, 60 * 1000);
    };

    const stopPing = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // start on login
    if (localStorage.getItem("access_token")) {
      startPing();
    }

    // clean up on unmount
    return () => stopPing();
  }, []);

  return {
    stopHeartbeat: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
  };
}

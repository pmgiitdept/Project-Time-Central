// src/utils/hosts.js

// Normalize base API URL
export function getApiBase() {
  return (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/").replace(/\/$/, "");
}

// Normalize base WS URL
export function getWsBase() {
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const wsHost = import.meta.env.VITE_WS_URL; // e.g. project-time-central.onrender.com
  const wsUrl = `${wsScheme}://${wsHost}/ws/chat/${roomName}/?token=${currentUser.token}`;

  return `${wsScheme}://${wsHost}`;
}


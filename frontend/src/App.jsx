// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import api from "./api"; 

import Login from "./components/Login.jsx";
import ViewerDashboard from "./pages/ViewerDashboard.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import useHeartbeat from "./hooks/useHeartBeat.jsx";

function App() {

  useHeartbeat();

  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return; 
      try {
        await api.post("/auth/ping/");
      } catch (err) {
        console.warn("Ping failed:", err);
      }
    }, 60 * 1000); 

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/viewer" element={<ViewerDashboard />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Default route */}
        <Route path="*" element={<Login />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}

export default App;
